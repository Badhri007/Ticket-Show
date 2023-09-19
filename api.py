import os
import csv
import bcrypt
import time
from datetime import timedelta
from dateutil import parser
from sqlalchemy import func,text
from flask_jwt_extended import unset_jwt_cookies
from io import StringIO, BytesIO
from flask import Flask, jsonify, request,render_template,make_response,send_file
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import aliased 
from sqlalchemy.exc import IntegrityError
from datetime import datetime
from flask_jwt_extended import JWTManager, jwt_required, create_access_token,get_jwt_identity,set_access_cookies,unset_jwt_cookies
from celery.schedules import crontab
from celery_worker import make_celery
from flask_caching import Cache
from flask_cors import CORS
from flask_mail import Mail, Message
from xhtml2pdf import pisa


app=Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your_secret_key_here'
db = SQLAlchemy(app)

app.config['JWT_SECRET_KEY'] = 'secret-secret'
jwt = JWTManager(app)
app.config['JWT_TOKEN_LOCATION'] = ['headers', 'cookies']
app.config['JWT_COOKIE_CSRF_PROTECT'] = False
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=10)

app.config.update(
    CELERY_BROKER_URL='redis://localhost:6379',
    CELERY_RESULT_BACKEND='redis://localhost:6379'
)
celery = make_celery(app)


mail = Mail(app)

app.config['MAIL_SERVER']='smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USERNAME'] = 'badhrilakshmi20032007@gmail.com'
app.config['MAIL_PASSWORD'] = 'lukzktxqtpxwpujh'
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_DEFAULT_SENDER'] = 'badhrilakshmi20032007@gmail.com' 

mail = Mail(app)
cache = Cache(app, config={'CACHE_TYPE': 'redis', 'CACHE_REDIS_URL': 'redis://localhost:6379/0'})
CORS(app) 



class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False) 
    email = db.Column(db.Text, unique=True, nullable=False)
    hash = db.Column(db.Text, nullable=False)
    role = db.Column(db.String(20), default='user', nullable=False)
    last_login = db.Column(db.Text, default=None)


class Theatre(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50))
    venue_location = db.Column(db.String, nullable=False)
    venue_capacity = db.Column(db.Integer, nullable=False)

    shows = db.relationship(
        "Show",
        backref="theatre",  # This will allow us to access the theatre from the Show model
        cascade="all, delete-orphan"  # This will automatically delete shows associated with a theatre
    )


class Show(db.Model):
    show_id = db.Column(db.Integer, primary_key=True, unique=True)
    show_name = db.Column(db.String(100), nullable=False)
    show_rating = db.Column(db.String(100), nullable=False)
    show_timing = db.Column(db.String(100), nullable=False)
    show_tags = db.Column(db.String(100), nullable=False)
    show_price = db.Column(db.Integer, nullable=False)
    total_tickets = db.Column(db.Integer, nullable=False)
    booked_tickets = db.Column(db.Integer, default=0)
    theatre_id = db.Column(db.Integer, db.ForeignKey('theatre.id'), nullable=False)

    # Unique constraints for show_timing and show_name within a specific theatre
    db.UniqueConstraint('theatre_id', 'show_timing', name='uq_theatre_show_timing')
    db.UniqueConstraint('theatre_id', 'show_name', name='uq_theatre_show_name')


    def get_available_tickets(self):
        return self.total_tickets - self.booked_tickets

    def update_available_tickets(self, num_tickets):
        self.booked_tickets = self.total_tickets - num_tickets

class TicketBooking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    theatre_name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(100), nullable=False)
    show_timing = db.Column(db.String(100), nullable=False)  # Change the datatype to String
    show_name = db.Column(db.String(100), nullable=False)
    show_status=db.Column(db.String(100),nullable=False)
    total_tickets = db.Column(db.Integer, nullable=False)
    total_price = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Foreign key reference to the Show model
    show_id = db.Column(db.Integer, db.ForeignKey('show.show_id'), nullable=False)
    show = db.relationship('Show', backref=db.backref('ticket_bookings'))

    def __init__(self, username, email, theatre_name, location, show_timing, show_name,show_status, total_tickets, total_price, show_id):
        self.username = username
        self.email = email
        self.theatre_name = theatre_name
        self.location = location
        self.show_timing = show_timing
        self.show_name = show_name
        self.show_status=show_status
        self.total_tickets = total_tickets
        self.total_price = total_price
        self.show_id = show_id


@celery.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    # Schedule the daily reminder task
    sender.add_periodic_task(
        # crontab(minute="*/3"), # Every 1 minute
        crontab(hour=7, minute=5),   
        send_remainders.s(),
        
    )
    sender.add_periodic_task(
        crontab(day_of_month=10, hour=7, minute=6),
        #  crontab(minute="*/5"),
        send_monthly_movie_report.s(),
    )

@celery.task()
def send_remainders():
    with app.app_context():
        users = User.query.all()
        for user in users:
            if (datetime.strptime(user.last_login, '%Y-%m-%d %H:%M:%S') < (datetime.today() - timedelta(days=1))):
                msg = Message(
                    subject="Bookings reminder!!! | Ticket Show",
                    recipients=[user.email],
                    sender="badhrilakshmi20032007@gmail.com",  # Specify the sender here
                    html=render_template("reminder.html", name=user.username),
                )
                mail.send(msg)
    return {'task': 'remainders'}




@celery.task()
def send_monthly_movie_report():
    with app.app_context():
        users = User.query.all()
        for user in users:
            # Get the current date and the first day of the current month
            today = datetime.now()
            first_day_of_month = today.replace(day=1)

            # Get the first day of the previous month
            last_month = first_day_of_month - timedelta(days=1)
            first_day_of_previous_month = last_month.replace(day=1)

            # Get movie ticket bookings of the user in the past month
            past_month_bookings = TicketBooking.query.filter(
    TicketBooking.username == user.username,
    TicketBooking.timestamp >= first_day_of_previous_month,
    TicketBooking.timestamp < first_day_of_month
).all()

            shows_watched = [booking.show_name for booking in past_month_bookings]
            print("User:", user)
            print("Today:", today)
            print("First Day of Month:", first_day_of_month)
            print("Past Month Bookings:", past_month_bookings)
            print("Shows wacthed:",shows_watched)

            # Calculate the required data for the report
            total_tickets_booked = sum(booking.total_tickets for booking in past_month_bookings)

            if past_month_bookings:
                genre_count = db.session.query(TicketBooking.show_id, func.count(TicketBooking.show_id)).filter(
                    TicketBooking.username == user.username,
                    TicketBooking.timestamp >= first_day_of_month - timedelta(days=30),
                    TicketBooking.timestamp < first_day_of_month
                ).group_by(TicketBooking.show_id).order_by(func.count(TicketBooking.show_id).desc()).first()

                show_id = genre_count[0]
                show = Show.query.filter_by(show_id=show_id).first()
                favorite_genre = show.show_tags if show else 'N/A'
            else:
                favorite_genre = 'N/A'

            top_cinema_hall = db.session.query(TicketBooking.theatre_name, func.count(TicketBooking.theatre_name)).filter(
                TicketBooking.username == user.username,
                TicketBooking.timestamp >= first_day_of_month - timedelta(days=30),
                TicketBooking.timestamp < first_day_of_month
            ).group_by(TicketBooking.theatre_name).order_by(func.count(TicketBooking.theatre_name).desc()).first()

            if top_cinema_hall:
                top_cinema_hall_name = top_cinema_hall[0]
            else:
                top_cinema_hall_name = 'N/A'

            movie_marathon_count = db.session.query(func.sum(TicketBooking.total_tickets)).filter(
                TicketBooking.username == user.username,
                TicketBooking.timestamp >= first_day_of_month - timedelta(days=30),
                TicketBooking.timestamp < first_day_of_month,
                TicketBooking.total_tickets >= 3
            ).scalar()
            


            print("User:",user)
            print("total_tickets_booked:",total_tickets_booked)
            print("Fav genre:",favorite_genre)
            print("top_cinema_hall:",top_cinema_hall)
            print("Movie marathon:",movie_marathon_count)
            #Render the HTML template with the required data
            html_content = render_template('monthly_report.html',
                                            user=user,
                                            total_tickets_booked=total_tickets_booked,
                                            favorite_genre=favorite_genre,
                                            top_cinema_hall_name=top_cinema_hall_name,
                                            movie_marathon_count=movie_marathon_count,
                                            shows_watched=shows_watched
                                           )

            # Generate the PDF content
            pdf_buffer = BytesIO()
            pisa.CreatePDF(BytesIO(html_content.encode('utf-8')), pdf_buffer)

            # Get the PDF content from the buffer
            pdf_content = pdf_buffer.getvalue()

            # Create an HTML email with PDF attachment
            subject = "Your Monthly Movie Ticket Booking Adventure"
            from_email = "badhrilakshmi20032007@gmail.com"
            to_email = user.email

            msg = Message(subject=subject, sender=from_email, recipients=[to_email])
            msg.body = "Please find your monthly movie ticket booking report attached."
            msg.attach("Monthly_Report.pdf", "application/pdf", pdf_content)

            # Send the email
            mail.send(msg)

    return {'task': 'send_monthly_movie_report'}




def parse_datetime(date_str):
    return datetime.strptime(date_str, '%Y-%m-%d %H:%M:%S')



@app.route('/trigger-celery-job')
def trigger_celery_job():
    a=generate_csv.delay()
    return {
        "Task_ID":a.id,
        "Task_State":a.state,
        "Task_Result":a.result 
    }





@app.route("/download-file")
def download_file():
    # Trigger the generate_csv task and get the result (the unique filename)
    task_result = generate_csv.apply_async()
    filename = task_result.get()

    # Check if the task result is a valid filename
    if not filename or not os.path.isfile(filename):
        return "Error: CSV file not found."

    # Serve the file for download
    return send_file(filename, as_attachment=True)



@celery.task()
def generate_csv():
    theaters = Theatre.query.all()
    if not theaters:
        return "No theaters found"

    # Prepare CSV data
    csv_data = StringIO()
    fields = ['Theatre ID', 'Name', 'Venue Location', 'Venue Capacity', 'Show ID', 'Show Name', 'Show Rating', 'Show Timing', 'Show Tags', 'Show Price', 'Total Tickets', 'Booked Tickets']
    csvwriter = csv.writer(csv_data)
    csvwriter.writerow(fields)

    for theater in theaters:
        for show in theater.shows:
            row = [
                theater.id,
                theater.name,
                theater.venue_location,
                theater.venue_capacity,
                show.show_id,
                show.show_name,
                show.show_rating,
                show.show_timing,
                show.show_tags,
                show.show_price,
                show.total_tickets,
                show.booked_tickets,
            ]
            csvwriter.writerow(row)

    # Create a unique filename using timestamp
    timestamp = int(time.time())
    filename = f"static/theatre_data_{timestamp}.csv"

    # Save CSV data to the unique file
    with open(filename, 'w') as csvfile:
        csvfile.write(csv_data.getvalue())

    return filename






@app.route('/')
@cache.memoize(1000)
def home():
    return render_template('index.html')



@app.route('/register', methods=['POST'])
def register():
    try:
        username = request.json.get('username', None)
        email = request.json.get('email', None)
        password = request.json.get('password', None)

        if not username or not email or not password:
            return jsonify({"success": False, "message": "Missing username, email, or password"}), 400

        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

        # Check if an admin user already exists in the database
        role = 'admin' if not User.query.filter_by(role='admin').first() else 'user'

        user = User(username=username, email=email, hash=hashed, role=role, last_login=None)
        db.session.add(user)
        db.session.commit()

        if role == 'admin':
            return jsonify({"success": True, "message": "Admin user registered successfully!"}), 201
        else:
            return jsonify({"success": True, "message": "User registered successfully!"}), 201

    except IntegrityError:
        db.session.rollback()
        return jsonify({"success": False, "message": "User Already Exists"}), 400
    except AttributeError:
        return jsonify({"success": False, "message": "Provide a Username, Email, and Password in JSON format in the request body"}), 400





@app.route('/login', methods=['POST'])
def login():
    access_token_cookie = request.cookies.get('access_token')

    if access_token_cookie:
        try:
            # Manually verify the JWT token
            jwt_required()

            # Token is valid, so the user is already logged in
            current_user = get_jwt_identity()
            return jsonify({'message': 'User already logged in', 'user': current_user}), 200

        except Exception:
            # Token verification failed or expired, clear the token from cookies
            response = jsonify({'message': 'Token verification failed or expired'})
            response.set_cookie('access_token', '', expires=0)
            return response, 401

    # Proceed with regular login
    email = request.json.get('email', None)
    
    password = request.json.get('password', None)

    if not email or not password:
        return 'Missing email or password', 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return 'User Not Found!', 404

    encoded_password = password.encode('utf-8')
    if bcrypt.checkpw(encoded_password, user.hash):
        # Include the 'role' in the identity dictionary
        
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")  #'YYYY-MM-DD HH:MM:SS'

        user.last_login = current_time
        print(user.last_login)
        db.session.commit()
       
        access_token = create_access_token(identity={"email": email, "role": user.role, "username": user.username})
        response = jsonify({'message': 'Login successful','role':user.role})

        # Update the access token in the response cookie
        set_access_cookies(response, access_token)

        return response, 200
    else:
        return jsonify({'message': 'Login details failed'}), 401



@app.route('/logout', methods=['POST'])
@jwt_required()  
def logout():
    response = jsonify({'message': 'Logged out successfully'})
    unset_jwt_cookies(response)

    return response, 200




@app.route('/add_theatre', methods=['POST'])
@jwt_required()
def add_theatre():
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Only admin can add theatres'}), 403
    data = request.get_json()
    print(data)
    name = data.get('name')
    venue_location = data.get('venue_location')
    venue_capacity = data.get('venue_capacity')

    if not name or not venue_location or not venue_capacity:
        return jsonify({'message': 'Invalid data provided'}), 400

    try:
        with app.app_context():
            shows = data.get('shows', [])
            for show_data in shows:
                show_data['total_tickets'] = venue_capacity

            theatre = Theatre(name=name, venue_location=venue_location, venue_capacity=venue_capacity)
            db.session.add(theatre)
            db.session.commit()

        return jsonify({'message': 'Theatre added successfully'}), 201

    except Exception as e:
        return jsonify({'message': 'Error occurred: {}'.format(str(e))}), 500




@app.route('/theatres', methods=['GET'])
@jwt_required()
def theatres():
    with app.app_context():
        theatres = Theatre.query.all()
        theatre_list = []
        for theatre in theatres:
            theatre_data = {
                'theatre_id': theatre.id,
                'theatre_name': theatre.name,
                'venue_location': theatre.venue_location,
                'venue_capacity': theatre.venue_capacity
            }
            theatre_list.append(theatre_data)
    return jsonify({'theatres': theatre_list})





@app.route('/upd_theatre/<int:theatre_id>', methods=['PUT'])
@jwt_required()
def upd_theatre(theatre_id):
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Only admin can update theatres'}), 403

    data = request.get_json()
    name = data.get('name')
    venue_location = data.get('venue_location')
    venue_capacity = data.get('venue_capacity')

    if not name or not venue_location or not venue_capacity:
        return jsonify({'message': 'Invalid data provided'}), 400

    try:
        with app.app_context():
            theatre = Theatre.query.get(theatre_id)

            if not theatre:
                return jsonify({'message': 'Theatre not found'}), 404

            # Check if the data needs to be updated, and only perform the update if necessary
            updated = False
            old_name = theatre.name
            old_location = theatre.venue_location

            if theatre.name != name and old_name != name:
                theatre.name = name
                updated = True

            if theatre.venue_location != venue_location and old_location != venue_location:
                theatre.venue_location = venue_location
                updated = True

            if theatre.venue_capacity != venue_capacity:
                theatre.venue_capacity = venue_capacity
                updated = True

            if updated:
                # Update TicketBooking records associated with the relevant shows of the theater
                shows_to_update = Show.query.filter_by(theatre_id=theatre_id).all()

                for show in shows_to_update:
                    bookings_to_update = TicketBooking.query.filter_by(show_id=show.show_id).all()

                    for booking in bookings_to_update:
                        if old_name != name:
                            booking.theatre_name = name
                        if old_location != venue_location:
                            booking.location = venue_location

                db.session.commit()

                return jsonify({'message': 'Theatre and relevant Bookings updated successfully'}), 200
            else:
                return jsonify({'message': 'No changes made, data is already up to date'}), 200

    except Exception as e:
        return jsonify({'message': 'Error occurred: {}'.format(str(e))}), 500






@app.route('/delete_theatre/<int:theatre_id>', methods=['DELETE'])
@jwt_required()
def delete_theatre(theatre_id):
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Only admin can delete theatres'}), 403

    try:
        with app.app_context():
            theatre = Theatre.query.get(theatre_id)

            if not theatre:
                return jsonify({'message': 'Theatre not found'}), 404

            # Delete the associated shows and bookings
            for show in theatre.shows:
                # Delete all ticket bookings associated with the show
                bookings = TicketBooking.query.filter_by(show_id=show.show_id).all()
                for booking in bookings:
                    db.session.delete(booking)

                db.session.delete(show)
                
            db.session.delete(theatre)
            db.session.commit()

            return jsonify({'message': 'Theatre and its shows deleted successfully'}), 200

    except Exception as e:
        return jsonify({'message': 'Error occurred: {}'.format(str(e))}), 500



@app.route('/get_shows/<int:theatre_id>', methods=['GET'])
@jwt_required()
def get_shows(theatre_id):
    try:
        theatre = Theatre.query.get(theatre_id)

        if not theatre:
            return jsonify({'message': 'Theatre not found'}), 404

        shows_list = []
        current_time = datetime.now()

        for show in theatre.shows:
            show_timing = datetime.strptime(show.show_timing, '%Y-%m-%d %H:%M:%S')

            # Compare year, month, date, and time one by one
            if current_time.year > show_timing.year:
                show_status = 'Ended'
            elif current_time.year == show_timing.year:
                if current_time.month > show_timing.month:
                    show_status = 'Ended'
                elif current_time.month == show_timing.month:
                    if current_time.day > show_timing.day:
                        show_status = 'Ended'
                    elif current_time.day == show_timing.day:
                        if current_time.time() >= show_timing.time():
                            show_status = 'ongoing'
                        else:
                            show_status = 'Upcoming'
                    else:
                        show_status = 'Upcoming'
                else:
                    show_status = 'Upcoming'
            else:
                show_status = 'Upcoming'

            show_data = {
                'show_id': show.show_id,
                'show_name': show.show_name,
                'show_rating': show.show_rating,
                'show_timing': show.show_timing,
                'show_tags': show.show_tags,
                'show_price': show.show_price,
                'total_tickets': show.total_tickets,
                'booked_tickets': show.booked_tickets,
                'show_status': show_status,
                'theatre': {
                    'theatre_id': theatre.id,
                    'theatre_name': theatre.name,
                    'venue_location': theatre.venue_location,
                    'venue_capacity': theatre.venue_capacity
                }
            }
            shows_list.append(show_data)

        return jsonify({'shows': shows_list}), 200

    except Exception as e:
        return jsonify({'message': 'Error occurred: {}'.format(str(e))}), 500


# Add Show

@app.route('/add_show/<int:theatre_id>', methods=['POST'])
@jwt_required()
def add_show(theatre_id):
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Only admin can add shows'}), 403
    data = request.get_json()

    show_name = data.get('show_name')
    
    show_timing = data.get('show_timing')
    show_tags = data.get('show_tags')
    try:
        show_rating = int(data.get('show_rating'))
        show_price = int(data.get('show_price'))
        total_tickets = int(data.get('total_tickets'))
        booked_tickets = int(data.get('booked_tickets'))
    except ValueError as e:
        return jsonify({'message': 'Invalid data provided'}), 400

    if not show_name or not show_rating or not show_timing or not show_tags or not show_price:
        return jsonify({'message': 'Invalid data provided'}), 400

    try:
        with app.app_context():
            theatre = Theatre.query.get(theatre_id)

            if not theatre:
                return jsonify({'message': 'Theatre not found'}), 404

            # Check if the show with the same name and timing already exists for this theatre
            existing_show = Show.query.filter_by(theatre_id=theatre_id, show_timing=show_timing).first()
            if existing_show:
                return jsonify({'message': 'A show with the same timing already exists for this theatre'}), 409

            existing_show = Show.query.filter_by(theatre_id=theatre_id, show_name=show_name).first()
            if existing_show:
                return jsonify({'message': 'A show with the same name already exists for this theatre'}), 409

            # Check if total_tickets is less than or equal to theatre's venue_capacity
            if total_tickets is None:
                total_tickets = theatre.venue_capacity
            elif total_tickets > theatre.venue_capacity:
                return jsonify({'message': 'Total tickets cannot exceed theatre venue capacity'}), 400

            show = Show(
                show_name=show_name,
                show_rating=show_rating,
                show_timing=show_timing,
                show_tags=show_tags,
                show_price=show_price,
                total_tickets=total_tickets,
                booked_tickets=booked_tickets,
                theatre_id=theatre_id
            )

            theatre.shows.append(show)
            db.session.add(show)
            db.session.commit()

            return jsonify({'message': 'Show added successfully'}), 201

    except Exception as e:
        return jsonify({'message': 'Error occurred: {}'.format(str(e))}), 500


# Update Show

@app.route('/update_show/<int:theatre_id>/<int:show_id>', methods=['PUT'])
@jwt_required()
def update_show(theatre_id, show_id):
    print("Update show request received for theatre ID:", theatre_id)
    print("Update show request received for show ID:", show_id)
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Only admin can update shows'}), 403
    data = request.get_json()

    show_name = data.get('show_name')
    show_rating = data.get('show_rating')
    show_timing = data.get('show_timing')
    show_tags = data.get('show_tags')
    show_price = data.get('show_price')
    total_tickets = data.get('total_tickets')
    booked_tickets = data.get('booked_tickets')

    if not show_name or not show_rating or not show_timing or not show_tags or not show_price:
        return jsonify({'message': 'Invalid data provided'}), 400

    try:
        with app.app_context():
            theatre = Theatre.query.get(theatre_id)

            if not theatre:
                return jsonify({'message': 'Theatre not found'}), 404

            show = Show.query.filter_by(show_id=show_id).first()

            if not show:
                return jsonify({'message': 'Show not found'}), 404

            # Check if total_tickets is less than or equal to theatre's venue_capacity
            if total_tickets is None:
                total_tickets = theatre.venue_capacity
            elif total_tickets > theatre.venue_capacity:
                return jsonify({'message': 'Total tickets cannot exceed theatre venue capacity'}), 400

            show.show_name = show_name
            show.show_rating = show_rating
            show.show_timing = show_timing
            show.show_tags = show_tags
            show.show_price = show_price
            show.total_tickets = total_tickets
            show.booked_tickets = booked_tickets

            db.session.commit()
            bookings_to_update = TicketBooking.query.filter_by(show_id=show_id).all()
            for booking in bookings_to_update:
                booking.total_price =booking.total_tickets*show.show_price  
                booking.show_timing = show.show_timing 
                booking.show_name = show.show_name  

            db.session.commit()

            return jsonify({'message': 'Show and relevant bookings updated successfully'}), 200
           

    except Exception as e:
        return jsonify({'message': 'Error occurred: {}'.format(str(e))}), 500



@app.route('/delete_show/<int:theatre_id>/<int:show_id>', methods=['DELETE'])
@jwt_required()
def delete_show(theatre_id, show_id):
    current_user = get_jwt_identity()
    if current_user['role'] != 'admin':
        return jsonify({'message': 'Only admin can delete shows'}), 403

    try:
        with app.app_context():
            theatre = Theatre.query.get(theatre_id)

            if not theatre:
                return jsonify({'message': 'Theatre not found'}), 404

            show = Show.query.filter_by(show_id=show_id, theatre_id=theatre_id).first()

            if not show:
                return jsonify({'message': 'Show not found'}), 404

            # Check if there are any ticket bookings associated with the show
            bookings = TicketBooking.query.filter_by(show_id=show_id).all()
            if bookings:
                # Delete all ticket bookings associated with the show
                for booking in bookings:
                    db.session.delete(booking)

            db.session.delete(show)
            db.session.commit()

            return jsonify({'message': 'Show and its associated bookings deleted successfully'}), 200

    except Exception as e:
        return jsonify({'message': 'Error occurred: {}'.format(str(e))}), 500








@app.route('/shows_available', methods=['GET'])
@jwt_required()
def shows_available():
    start_time_str = request.args.get('start_time')
    end_time_str = request.args.get('end_time')

    if not start_time_str or not end_time_str:
        return jsonify({'message': 'Invalid timeframe provided'}), 400

    try:
        start_time = parser.parse(start_time_str)
        end_time = parser.parse(end_time_str)

        with app.app_context():
            shows = Show.query.filter(
                func.datetime(Show.show_timing) >= start_time,
                func.datetime(Show.show_timing) <= end_time
            ).all()

            shows_list = []
            for show in shows:
                show_data = {
                    'show_id': show.show_id,
                    'show_name': show.show_name,
                    'show_rating': show.show_rating,
                    'show_timing': show.show_timing, 
                    'show_tags': show.show_tags,
                    'show_price': show.show_price,
                    'total_tickets': show.total_tickets,
                    'booked_tickets': show.booked_tickets,
                    'available_tickets': show.get_available_tickets() 
                }

                # Fetch the theatre details for the current show
                theatre = Theatre.query.get(show.theatre_id)
                if theatre:
                    theatre_details = {
                        'theatre_id': theatre.id,
                        'theatre_name': theatre.name,
                        'venue_location': theatre.venue_location,
                        'venue_capacity': theatre.venue_capacity
                    }
                    show_data['theatre'] = theatre_details
                else:
                    show_data['theatre'] = None

                shows_list.append(show_data)

            return jsonify({'shows_available': shows_list}), 200

    except Exception as e:
        return jsonify({'message': 'Error occurred: {}'.format(str(e))}), 500






@app.route('/book_tickets/<int:theatre_id>/<int:show_id>', methods=['POST'])
@jwt_required()
def book_tickets(theatre_id, show_id):
  

    current_user = get_jwt_identity()
    data = request.get_json()
    num_tickets = int(data.get('num_tickets'))

    try:
        with app.app_context():
            show = Show.query.filter_by(show_id=show_id, theatre_id=theatre_id).first()
            theatre = Theatre.query.filter_by(id=theatre_id).first()

            if not show:
                return jsonify({'message': 'Show not found for the specified theatre'}), 404

            available_tickets = int(show.get_available_tickets())

            if available_tickets < num_tickets:
                return jsonify({'message': 'Not enough tickets available'}), 409

            # Check if the show has already started
            current_time = datetime.now()
            show_time = datetime.strptime(show.show_timing, '%Y-%m-%d %H:%M:%S')

            if current_time >= show_time:
                
                return jsonify({'message': 'Sorry, the show has already started. You cannot book tickets for this show.'}), 409

            # Update the available_tickets count in the show after booking
            show.update_available_tickets(available_tickets - num_tickets)

          

            # Create a new ticket booking entry and save it to the database
            ticket_booking = TicketBooking(
                username=current_user['username'],
                email=current_user['email'],
                theatre_name=show.theatre.name,
                location=theatre.venue_location,
                show_timing=show.show_timing,
                show_name=show.show_name,
                total_tickets=num_tickets,
                show_status="Upcoming",
                total_price=num_tickets * show.show_price,
                show_id=show.show_id
            )
            db.session.add(ticket_booking)
            db.session.commit()
            return jsonify({'message': f'{num_tickets} tickets booked successfully'}), 200

    except Exception as e:
        return jsonify({'message': 'Error occurred: {}'.format(str(e))}), 500


@app.route('/delete_booking/<int:booking_id>', methods=['DELETE'])
@jwt_required()
def delete_booking(booking_id):
    current_user = get_jwt_identity()
    email = current_user['email']
    booking = TicketBooking.query.filter_by(id=booking_id, email=email).first()

    if not booking:
        return jsonify({'success': False, 'message': 'Booking not found for this user'}), 404

    try:
        # Get the associated show
        show = booking.show
        print("Booked tickets before:",show.booked_tickets)
        # Update the booked_tickets count of the show
        show.booked_tickets -= booking.total_tickets
        print("Booked tickets after:",show.booked_tickets)
        db.session.delete(booking)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Booking deleted successfully'}), 200
    except:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Failed to delete booking'}), 500





@app.route('/search_shows', methods=['GET'])
@jwt_required()
def search_shows():
    location = request.args.get('location')
    tags = request.args.get('tags')
    name = request.args.get('name')
    print("Received location:",location)
    print("Received tag:",tags)
    print("Received name:",name)
    try:
        with app.app_context():
            query = db.session.query(Show).join(Show.theatre)

            if location:
                # Use alias for the Theatre model to avoid ambiguity in join
                theatre_alias = aliased(Theatre)
                query = query.join(theatre_alias, Show.theatre)

                query = query.filter(theatre_alias.venue_location.ilike(f'%{location}%'))

            if tags:
                query = query.filter(Show.show_tags.ilike(f'%{tags}%'))

            if name:
                query = query.filter(Show.show_name.ilike(f'%{name}%'))

            shows = query.all()

            shows_list = []
            current_time = datetime.now()

            for show in shows:
                show_timing = datetime.strptime(show.show_timing, '%Y-%m-%d %H:%M:%S')

            # Compare year, month, date, and time one by one
                if current_time.year > show_timing.year:
                    show_status = 'Ended'
                elif current_time.year == show_timing.year:
                    if current_time.month > show_timing.month:
                        show_status = 'Ended'
                    elif current_time.month == show_timing.month:
                        if current_time.day > show_timing.day:
                            show_status = 'Ended'
                        elif current_time.day == show_timing.day:
                            if current_time.time() >= show_timing.time():
                                show_status = 'Ongoing'
                            else:
                                show_status = 'Upcoming'
                        else:
                            show_status = 'Upcoming'
                    else:
                        show_status = 'Upcoming'
                else:
                    show_status = 'Upcoming'





                show_data = {
                    'show_id': show.show_id,
                    'show_name': show.show_name,
                    'show_rating': show.show_rating,
                    'show_timing': show.show_timing,
                    'show_tags': show.show_tags,
                    'show_price': show.show_price,
                    'total_tickets': show.total_tickets,
                    'booked_tickets': show.booked_tickets,
                    'show_status':show_status,
                    'theatre': {
                        'theatre_id': show.theatre.id,
                        'theatre_name': show.theatre.name,
                        'venue_location': show.theatre.venue_location,
                        'venue_capacity': show.theatre.venue_capacity
                    }
                }
                shows_list.append(show_data)
            print("Data sent",shows_list)
            return jsonify({'shows': shows_list}), 200

    except Exception as e:
        return jsonify({'message': 'Error occurred: {}'.format(str(e))}), 500


@app.route('/my_bookings', methods=['GET'])
@jwt_required()
def my_bookings():
    current_user = get_jwt_identity()
    username = current_user['username']
    email = current_user['email']
    bookings = TicketBooking.query.filter_by(email=email,username=username).all()

    if not bookings:
        return jsonify({'message': 'No bookings found for this user'}), 404

    bookings_data = []
    for booking in bookings:
        booking_data = {
            'booking_id': booking.id,
            'username': booking.username,
            'email': booking.email,
            'theatre_name': booking.theatre_name,
            'location': booking.location,
            'show_timing': booking.show_timing,
            'show_name': booking.show_name,
            'show_status':booking.show_status,
            'total_tickets': booking.total_tickets,
            'total_price': booking.total_price,
            'timestamp': booking.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
        }
        bookings_data.append(booking_data)

    return jsonify({'bookings': bookings_data}), 200


@app.route('/all_shows', methods=['GET'])
@jwt_required()
def all_shows():
    try:
        shows = Show.query.all()

        shows_list = []
        current_time = datetime.now()

        for show in shows:
            show_timing = datetime.strptime(show.show_timing, '%Y-%m-%d %H:%M:%S')

            # Compare year, month, date, and time one by one
            if current_time.year > show_timing.year:
                show_status = 'Ended'
            elif current_time.year == show_timing.year:
                if current_time.month > show_timing.month:
                    show_status = 'Ended'
                elif current_time.month == show_timing.month:
                    if current_time.day > show_timing.day:
                        show_status = 'Ended'
                    elif current_time.day == show_timing.day:
                        if current_time.time() >= show_timing.time():
                            show_status = 'ongoing'
                        else:
                            show_status = 'Upcoming'
                    else:
                        show_status = 'Upcoming'
                else:
                    show_status = 'Upcoming'
            else:
                show_status = 'Upcoming'

            show_data = {
                "show_id": show.show_id,
                "show_name": show.show_name,
                "show_rating": show.show_rating,
                "show_timing": show.show_timing,
                "show_tags": show.show_tags,
                "show_price": show.show_price,
                "total_tickets": show.total_tickets,
                "available_tickets": show.get_available_tickets(),
                "show_status": show_status,
                "theatres": [
                    {
                        "theatre_id": show.theatre.id,
                        "theatre_name": show.theatre.name,
                        "venue_location": show.theatre.venue_location
                    }
                ]
            }
            shows_list.append(show_data)

        return jsonify({'all_shows': shows_list}), 200

    except Exception as e:
        return jsonify({'message': 'Error occurred: {}'.format(str(e))}), 500






if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)
    


