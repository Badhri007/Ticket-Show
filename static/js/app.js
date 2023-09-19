const Register = Vue.component("register", {
  template: `
  <div class="container d-flex justify-content-center align-items-center">
  <div class="card">
  <div class="card-body">
      <h2>Register</h2>
      <br>
      <form @submit.prevent="registerUser">
      <div>
        <label for="username" class="form-label">Username</label>
        <input type="text" id="username" class="form-control" v-model="username" required><br><br>
        </div>
        <div>
        <label for="email" class="form-label">Email</label>
        <input type="email" id="email" v-model="email" class="form-control" required><br><br>
        </div>
        <div>
        <label for="password" class="form-label">Password</label>
        <input type="password" id="password" v-model="password" class="form-control" required><br><br>
        </div>
        
        <button type="submit" class="btn btn-dark">Register</button>
        
      </form>
      <br>
    
      <p v-if="message" :style="{ color: isSuccess ? 'green' : 'red' }">{{ message }}</p>
      </div>
      </div>
    </div>
  `,
  data() {
    return {
      username: "",
      email: "",
      password: "",
      message: "",
      isSuccess: false, 
    };
  },
  methods: {
    registerUser() {
      const formData = {
        username: this.username,
        email: this.email,
        password: this.password,
      };

  
      fetch("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })
        .then((response) => response.json())
        .then((data) => {
         
          if (data.success) {
          
            console.log(data.message);
            this.isSuccess = true;
            this.message = data.message;
            this.username = "";
            this.email = "";
            this.password = "";

           
            this.$router.push("/login");
          } else {
            
            console.error(data.message);
            this.isSuccess = false;
            this.message = data.message;
          }
        })
        .catch((error) => {
          console.error("Error registering user:", error);
          this.isSuccess = false;
          this.message = "An error occurred during registration.";
        });
    },
  },
});

const Login = Vue.component("login", {
  template: `
    <div class="container d-flex justify-content-center align-items-center">
    <div class="card">
    <div class="card-body">
      <h2>Login</h2><br>
      <form @submit.prevent="loginUser">
        <b><label for="email" class="form-label">Email</label></b>
        <input type="email"  id="email" v-model="email" class="form-control" required><br><br>
        <b><label for="password" class="form-label">Password</label></b>
        <input type="password"  id="password" v-model="password" class="form-control" required><br><br>
        <button type="submit" class="btn btn-dark">Login</button>
      </form>
      <p v-if="message" :style="{ color: isSuccess ? 'green' : 'red' }">{{ message }}</p>
      </div>
      </div>
    </div>
  `,
  data() {
    return {
      email: "",
      password: "",
      message: "",
      isSuccess: false,
    };
  },
  created() {
   
    if (this.isLoggedIn()) {
      this.$router.push("/"); 
    }
  },
  methods: {
    loginUser() {
      const formData = {
        email: this.email,
        password: this.password,
      };

  
      fetch("/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.message === "Login successful") {
            console.log(data.message);
            this.isSuccess = true;
            this.message = data.message;
            this.email = "";
            this.password = "";

            // Store the access token in a cookie with a 10-minute expiration
            const now = new Date();
            now.setTime(now.getTime() + 10 * 60 * 1000);
            document.cookie = `access_token=${data.access_token}; expires=${now.toUTCString()}`;
            document.cookie = `user_role=${data.role}; expires=${now.toUTCString()}`;

            // Set the isLoggedIn flag to true in the root Vue instance
            a.isLoggedIn = true;

            this.$router.push("/");
          } else {
          
            console.error(data.message);
            this.isSuccess = false;
            this.message = data.message;
          }
        })
        .catch((error) => {
          console.error("Error logging in:", error);
          this.isSuccess = false;
          this.message = "An error occurred during login.";
        });
    },
    isLoggedIn() {
      const access_token = this.getCookie("access_token");
      return access_token ? true : false;
    },
    getCookie(name) {
      const value = "; " + document.cookie;
      const parts = value.split("; " + name + "=");
      if (parts.length === 2) return parts.pop().split(";").shift();
    },
  },
});


const Logout = Vue.component("logout", {
          beforeRouteEnter(to, from, next) {
          
            fetch("/logout", {
              method: "POST",
            })
              .then((response) => {
                if (response.status === 200) {
             
                  console.log("Logout successful");
              
                  document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                  document.cookie = "user_role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        
                  // You can redirect the user to the login page using Vue Router
                  next({ path: "/login" });
                  
                } else {
                  console.error("Logout failed");
                  next();
                }
              })
              .catch((error) => {
                console.error("Error during logout:", error);
                next();
              });
          },
});
    

const Home = Vue.component("home", {
  template: `
  <div>
  <div class="container">
      <h2 style="text-align:center;color:red;"><i>Welcome to Ticket Show !!!!</i></h2>
      <br>
      <div class="row">
          <div class="col-md-6">
            <img src="static/project.jpg" class="img-fluid rounded" style="height: auto; max-width: 100%;"/>
            <h4>Wanna know about all movies running?</h4>
            <router-link to="/shows" class="btn btn-primary">View Shows</router-link>
          </div>
          <div class="col-md-6">
            <img src="static/theatre.jpg" class="img-fluid rounded" style="height: auto; max-width: 100%;"/>
            <h4>Wanna know about the Theatres?</h4>
            <router-link to="/theatres" class="btn btn-primary">View Theatres</router-link>
            </div>
      </div>
</div>

</div>

  `,
  data() {
      return {
        userRole: null,
      };
    },
    created() {
      this.userRole = this.getUserRoleFromCookie();
    },
    methods: {
      getUserRoleFromCookie() {
         
        const cookies = document.cookie.split("; ");
        for (const cookie of cookies) {
          const [name, value] = cookie.split("=");
          if (name === "user_role") {
            return value;
          }
        }
        return null;
      },

    

    },
  
})

const AddTheatre = Vue.component("add_theatre", {
  template: `
    <div style="margin-left:5rem;" v-if="userRole === 'admin'">
      <h2 >Add a New Theatre</h2>
      <form @submit.prevent="addTheatre">
        <label for="theatreName">Theatre Name</label>
        <input type="text" id="theatreName" v-model="theatreName" required><br><br>

        <label for="theatreVenue">Theatre Venue</label>
        <input type="text" id="theatreVenue" v-model="theatreVenue" required><br><br>

        <label for="theatreCapacity">Theatre Capacity</label>
        <input type="text" id="theatreCapacity" v-model="theatreCapacity" required><br><br>

        <button type="submit" class="btn btn-primary">Add Theatre</button>
      </form>
      <p v-if="message" :style="{ color: isSuccess ? 'green' : 'red' }">{{ message }}</p>
    </div>
    <p v-else>Admin Only can access this page </p>
  `,
  data() {
    return {
      theatreName: "",
      theatreVenue: "",
      theatreCapacity: "",
      message: "",
      userRole: null,
      isSuccess: false,
    };
  },
  created()
  {
    this.userRole = this.getUserRoleFromCookie();
  },
  methods: {
    getUserRoleFromCookie() {
  
      const cookies = document.cookie.split("; ");
      for (const cookie of cookies) {
        const [name, value] = cookie.split("=");
        if (name === "user_role") {
          return value;
        }
      }
      return null;
    },
    addTheatre() {
      const theatreData = {
        name: this.theatreName,
        venue_location: this.theatreVenue,
        venue_capacity: this.theatreCapacity,
      };

    
      fetch("/add_theatre", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(theatreData),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
        
          console.log(data); 
          if (data.message === "Theatre added successfully") {
            this.isSuccess = true;
            this.message = data.message;
            // Clear the form after successful addition
            this.theatreName = "";
            this.theatreVenue = "";
            this.theatreCapacity = "";

          
            this.$router.push({ path: "/theatres" });
          } else {
            this.isSuccess = false;
            this.message = data.message;
          }
        })
        .catch((error) => {
          console.error("Error adding theatre:", error);
          this.isSuccess = false;
          this.message = "An error occurred while adding the theatre.";
        });
    },
  },
});

const Theatre = Vue.component("theatres", {
  template: `
  <div class="d-flex justify-content-center align-items-center">

  <h2 class="text-center" v-if="userRole !== 'admin' && userRole !== 'user'">Please Login to access this page !!!</h2>
  <div v-else>

      <h2 class="text-center">All Theatres Page</h2>

      <div v-if="userRole === 'admin'" class="text-end">
          <button @click="trigger_celery_job" class="btn btn-success">Download theatre details</button>
      </div>

      <div class="row">
          <div class="col-md-6 col-lg-4 mb-4" v-for="theatre in theatreList" :key="theatre.theatre_id">
              <div class="card">
                  <div class="card-header">
                      <h4>{{ theatre.theatre_name }}</h4>
                  </div>
                  <div class="card-body">
                      <p class="card-text">Location: {{ theatre.venue_location }}</p>
                      <p class="card-text">Capacity: {{ theatre.venue_capacity }}</p>
                      <router-link :to="'/get_shows/' + theatre.theatre_id" class="btn btn-primary mx-auto">View Shows</router-link>

                      <div v-if="userRole === 'admin'">
                          <br>
                          <button @click="editTheatre(theatre)" class="btn btn-info mx-2">
                              <i class="bi bi-pencil"></i> Edit
                          </button>
                          <delete_theatre :theatreId="theatre.theatre_id" :theatreName="theatre.theatre_name" @onDeleteTheatre="onDeleteTheatre"></delete_theatre>
                      </div>
                  </div>
              </div>
          </div>
      </div>

  </div>

  <update_theatre v-if="editingTheatre" :theatreId="editingTheatre.theatre_id" :editedTheatre="editingTheatre" @onFinishEdit="onFinishEdit"></update_theatre>

</div>
`,

  data() {
    return {
      theatreList: [],
      userRole: null,
      editingTheatre: null,
    };
  },
  created() {
    this.userRole = this.getUserRoleFromCookie();
    this.fetchTheatreData();
  },
  methods: {
    getUserRoleFromCookie() {
      const cookies = document.cookie.split("; ");
      for (const cookie of cookies) {
        const [name, value] = cookie.split("=");
        if (name === "user_role") {
          return value;
        }
      }
      return null;
    },
    trigger_celery_job:function()
    {
      fetch("/trigger-celery-job").then(r => r.json()).then(d=>{console.log("Celery task details",d);
      window.location.href="/download-file"
    })
    },
    onDeleteTheatre() {
      // Called when a theatre is deleted to refresh the theatre list
      this.fetchTheatreData();
    },
    fetchTheatreData() {
      fetch("/theatres")
        .then((response) => response.json())
        .then((data) => {
          this.theatreList = data.theatres;
        })
        .catch((error) => {
          console.error("Error fetching theatre data:", error);
        });
    },
    editTheatre(theatre) {
      // Set the editingTheatre to the selected theatre to trigger the display of the UpdateTheatre component
      this.editingTheatre = { ...theatre };
    },
    onFinishEdit() {
      this.fetchTheatreData();
      this.editingTheatre = null;
    },
  },
});


const UpdateTheatre = Vue.component("update_theatre", {
  template: `
    <div style="margin-left:5rem;">
      <h2>Edit Theatre</h2>
      <form @submit.prevent="updateTheatre">
        <div class="form-group">
          <label for="theatreName">Theatre Name</label>
          <input type="text" class="form-control" v-model="editedTheatre.theatre_name" required>
        </div>
        <div class="form-group">
          <label for="theatreVenue">Theatre Venue</label>
          <input type="text" class="form-control" v-model="editedTheatre.venue_location" required>
        </div>
        <div class="form-group">
          <label for="theatreCapacity">Theatre Capacity</label>
          <input type="text" class="form-control" v-model="editedTheatre.venue_capacity" required>
        </div>
        <button type="submit" class="btn btn-primary">Update Theatre</button>
        <button @click="cancelEdit" class="btn btn-secondary">Cancel</button>
      </form>
    </div>
  `,
  props: {
    theatreId: {
      type: Number,
      required: true,
    },
    editedTheatre: {
      type: Object,
      required: true,
    },
  },
  methods: {
    updateTheatre() {
      fetch(`/upd_theatre/${this.theatreId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: this.editedTheatre.theatre_name,
          venue_location: this.editedTheatre.venue_location,
          venue_capacity: this.editedTheatre.venue_capacity,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.message === "Theatre and relevant Bookings updated successfully") {
            console.log("Theatre & relevant bookings updated successfully");
            this.$emit("onFinishEdit");
          } else {
            console.error("Theatre update failed");
            this.$emit("onFinishEdit");
          }
        })
        .catch((error) => {
          console.error("Error during theatre update:", error);
          this.$emit("onFinishEdit");
        });
    },
    cancelEdit() {
      this.$emit("onFinishEdit");
    },
  },
});


const DeleteTheatre = Vue.component("delete_theatre", {
  template: `
    
      <button @click="confirmDelete" class="btn btn-danger">Delete</button>
    
  `,
  props: {
    theatreId: {
      type: Number,
      required: true,
    },
    theatreName: {
      type: String,
      required: true,
    },
  },
  methods: {
    confirmDelete() {
      if (window.confirm(`Are you sure you want to delete the theatre: ${this.theatreName}?`)) {
        fetch(`/delete_theatre/${this.theatreId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then((response) => {
            if (response.status === 200) {
              console.log("Theatre deleted successfully");
              this.$emit("onDeleteTheatre");
            } else {
              console.error("Theatre deletion failed");
            }
          })
          .catch((error) => {
            console.error("Error during theatre deletion:", error);
          });
      }
    },
    cancelDelete() {
      this.$router.push({ path: "/theatres" });
    },
  },
});


const Shows = Vue.component("shows", {
  template: `
  <div style="margin-left:2rem;">
  <h2 v-if="userRole !== 'admin' && userRole !== 'user'">Please Login to access this page !!!</h2>
  <div v-else>
    <h2>All Shows Page</h2>
    <div v-if="showsList.length === 0">
      <p>No shows available.</p>
    </div>
    <div v-else>
      <div class="row">
        <div class="col-md-4 mb-4" v-for="show in sortedShows" :key="show.show_id">
          <div class="card border-dark">
            <div class="card-header bg-dark">
              <h5 class="text-light">{{ show.show_name }}</h5>
            </div>
            <div class="card-body">
            <p class="card-text">Status  :<b>{{show.show_status}}</b></p>
              <p class="card-text">Rating: {{ show.show_rating }}</p>
              <p class="card-text">Timing: {{ show.show_timing }}</p>
              <p class="card-text">Tags: {{ show.show_tags }}</p>
              <h6>Theatres:</h6>
              <ul class="list-group">
                <li v-for="theatre in show.theatres" :key="theatre.theatre_id" class="list-group-item">
                  <b>{{ theatre.theatre_name }}</b> - {{ theatre.venue_location }}
                  (Price: {{ show.show_price }}, Total Tickets: {{ show.total_tickets }},
                  Available Tickets: {{ show.available_tickets }})
                  <br>
                  
                  <router-link v-if="show.show_status === 'Upcoming' && show.available_tickets > 0" :to="'/book_tickets/' + theatre.theatre_id + '/' + show.show_id" class="btn btn-primary">Book Tickets</router-link>
                  <button v-else-if="show.show_status === 'Upcoming' && (show.available_tickets <= 0)" class="btn btn-secondary">Housefull</button>
             
                  <router-link v-if="userRole === 'admin'" :to="'/update_show/' + theatre.theatre_id + '/' + show.show_id" class="btn btn-warning">Update</router-link>
                  <button v-if="userRole === 'admin'" @click="confirmDelete(theatre.theatre_id, show)" class="btn btn-danger">Delete</button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  `,
  data() {
    return {
      userRole: null,
      showsList: [],
      searchResults: [],
      searchedShows: [], 
    };
  },
  created() {
    this.userRole = this.getUserRoleFromCookie();
    this.fetchShowsData();
  },
  computed: {
    sortedShows() {
      return this.showsList
        .slice()
        .sort((a, b) => new Date(b.show_timing) - new Date(a.show_timing));
    },
    rowGroups() {
      const groups = [];
      for (let i = 0; i < this.sortedShows.length; i += 3) {
        groups.push(this.sortedShows.slice(i, i + 3));
      }
      return groups;
    },
    upcomingShowsWithTickets() {
      return this.showsList.filter((show) => show.show_status === 'upcoming' && show.total_tickets - show.booked_tickets > 0);
    },
  },
  methods: {
    fetchShowsData() {
      fetch("/all_shows")
        .then((response) => response.json())
        .then((data) => {
          this.showsList = data.all_shows;
        })
        .catch((error) => {
          console.error("Error fetching shows data:", error);
        });
    },
    getUserRoleFromCookie() {
      const cookies = document.cookie.split("; ");
      for (const cookie of cookies) {
        const [name, value] = cookie.split("=");
        if (name === "user_role") {
          return value;
        }
      }
      return null;
    },
    confirmDelete(theatreId, show) {
      if (window.confirm("Are you sure you want to delete this show?")) {
        this.deleteShow(theatreId, show);
      }
    },
    deleteShow(theatreId, show) {
      const showId = show.show_id;

      fetch(`/delete_show/${theatreId}/${showId}`, {
        method: 'DELETE',
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then((data) => {
          console.log(data);
          this.fetchShowsData(theatreId);
        })
        .catch((error) => {
          console.error("Error deleting show:", error);
        });
    },
  },
});


const Get_Shows = Vue.component('get_shows', {
template: `
  <div style="margin-left:5rem;">
      <h4 v-if="showsList.length==0"> No Shows currently running in this theatre !!!</h4>
  
  <div v-else>
    <div class="row">
      <div class="col-md-12">
        <h2>{{ theatreName }} Theatre Shows</h2>
        <br>
        <h5><b>Location:</b> <i>{{ theatreLocation }}</i></h5>
        <br>
      </div>
    </div>
    <div class="row">
      <div class="col-md-4 mb-4" v-for="show in showsList" :key="show.show_id">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">{{ show.show_name }}</h5>
            <p class="card-text">Status :<b>{{ show.show_status }}</b></p
            <p class="card-text">Rating: {{ show.show_rating }}</p>
            <p class="card-text">Timing: {{ show.show_timing }}</p>
            <p class="card-text">Tags: {{ show.show_tags }}</p>
            <p>Price: {{ show.show_price }}</p>
            <p>Total Tickets: {{ show.total_tickets }}</p>
            <p>Booked Tickets: {{ show.booked_tickets }}</p>
            <b>  Available Tickets: {{ show.total_tickets - show.booked_tickets }}</b>
            <br>
            <button v-if="userRole === 'admin'" @click="redirectToUpdateShow(show)" class="btn btn-warning mt-2">Update Show</button>
           
            <!-- Assuming the rest of the component remains the same, focus on the button with the deletion logic -->
            <button v-if="userRole === 'admin'" @click="confirmDelete(show)" class="btn btn-danger mt-2">Delete Show</button>
            <button v-if="show.show_status === 'Upcoming' && (show.total_tickets - show.booked_tickets > 0)" @click="redirectToBookTickets(show)" class="btn btn-primary mt-2">Book Tickets</button>
            
            
            <button v-else-if="show.show_status === 'Upcoming'&&(show.total_tickets - show.booked_tickets <= 0)" class="btn btn-secondary mt-2">Housefull</button>
            
            </div>
        </div>
      </div>
    </div>
</div>
    <!-- Show the "Add Show" button for admin users only -->
    <button v-if="userRole === 'admin'" @click="redirectToAddShow" class="btn btn-primary mt-4">Add Show</button>
  </div>
`,
data() {
  return {
    userRole: null,
    theatreName: "",
    theatreLocation: "",
    showsList: [], 
  };
},
computed: {
  isAdmin() {
    const current_user = JSON.parse(localStorage.getItem('current_user')); 
    return current_user && current_user.role === 'admin'; 
  },
},
created() {
  this.userRole = this.getUserRoleFromCookie();
  const theatreId = this.$route.params.theatre_id;

  this.fetchShowsData(theatreId);
},
methods: {
  
  redirectToBookTickets(show) {
    const theatreId = this.$route.params.theatre_id;
    const showId = show.show_id;
    this.$router.push({ path: `/book_tickets/${theatreId}/${showId}` });
  },
  confirmDelete(show) {
    if (window.confirm("Are you sure you want to delete this show?")) {
      this.deleteShow(show);
    }
  },

  deleteShow(show) {
    const theatreId = this.$route.params.theatre_id;
    const showId = show.show_id;
  
    fetch(`/delete_show/${theatreId}/${showId}`, {
      method: 'DELETE',
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then((data) => {
      console.log(data);
      this.fetchShowsData(theatreId);
    })
    .catch((error) => {
      console.error("Error deleting show:", error);
    });
  },
  fetchShowsData(theatreId) {
    fetch(`/get_shows/${theatreId}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then((data) => {
        if (data.shows && data.shows.length > 0) {
          this.showsList = data.shows;
          this.theatreName = data.shows[0].theatre.theatre_name;
          this.theatreLocation = data.shows[0].theatre.venue_location;
        } else {
          console.error('No shows data available.');
        }
      })
      .catch((error) => {
        console.error('Error fetching shows data:', error);
      });

  },
  
  redirectToAddShow() {
    const theatreId = this.$route.params.theatre_id;
    this.$router.push({ path: `/add_show/${theatreId}` });
  },

  redirectToUpdateShow(show) {
    const theatreId = this.$route.params.theatre_id;
    this.$router.push({ path: `/update_show/${theatreId}/${show.show_id}` });
  },

  onDeleteTheatre(show) {
    const theatreId = this.$route.params.theatre_id;
    this.$router.push({ path: `/delete_show/${theatreId}/${show.show_id}` });
  },

  getUserRoleFromCookie() {
    const cookies = document.cookie.split("; ");
    for (const cookie of cookies) {
      const [name, value] = cookie.split("=");
      if (name === "user_role") {
        return value;
      }
    }
    return null;
  },
},
});


const Add_Show = Vue.component("add_show", {
  template: `
    <div style="margin-left:5rem;">
      <h2 >Add Show</h2>
      <form @submit.prevent="addShow">
        <div class="form-group">
          <label for="showName">Show Name</label>
          <input type="text" class="form-control" v-model="newShow.show_name" placeholder="Enter Movie name" required>
        </div>
        <div class="form-group">
          <label for="showRating">Show Rating</label>
          <input type="number" class="form-control" v-model="newShow.show_rating" placeholder="Enter Rating 1-5" required>
        </div>
        <div class="form-group">
          <label for="showTiming">Show Timing</label>
          <input type="text" class="form-control" v-model="newShow.show_timing" placeholder="YYYY-MM-DD hr:min" required>
        </div>
        <div class="form-group">
          <label for="showTags">Show Tags</label>
          <input type="text" class="form-control" v-model="newShow.show_tags" placeholder="Genre (Action,Adventure....)"required>
        </div>
        <div class="form-group">
          <label for="showPrice">Show Price</label>
          <input type="number" class="form-control" v-model="newShow.show_price" placeholder="Enter Ticket price"required>
        </div>
        <div class="form-group">
          <label for="totalTickets">Total Tickets</label>
          <input type="number" class="form-control" v-model="newShow.total_tickets"  placeholder="Enter total capacity"required>
        </div>
        <div class="form-group">
          <label for="bookedTickets">Booked Tickets</label>
          <input type="number" class="form-control" v-model="newShow.booked_tickets" placeholder="Enter booked/blocked tickets" required>
        </div>
        <button type="submit" class="btn btn-primary">Add Show</button>
      </form>
    </div>
  `,
  data() {
      return {
        newShow: {
          show_name: '',
          show_rating: '',
          show_timing: '',
          show_tags: '',
          show_price: '',
          total_tickets: '',
          booked_tickets: '',
        },
      };
    },
    methods: {
      addShow() {
          const theatreId = this.$route.params.theatre_id;
          fetch(`/add_show/${theatreId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            
            },
            body: JSON.stringify(this.newShow),
          })
            .then((response) => response.json())
            .then((data) => {
              console.log('Show added successfully:', data);
              this.newShow = {
                show_name: '',
                show_rating: '',
                show_timing: '',
                show_tags: '',
                show_price: '',
                total_tickets: '',
                booked_tickets: '',
              };
              this.$router.push({ path: `/get_shows/${theatreId}` });
            })
            .catch((error) => {
              console.error('Error adding show:', error);
          
            });
        },
      }
});       


const UpdateShow = Vue.component('update_show', {
  template: `
    <div style="margin-left:5rem;">
      <h2 >Update Show</h2>
      <form @submit.prevent="updateShow">
        <!-- Form inputs for show data -->
        <div class="form-group">
          <label for="showName">Show Name:</label>
          <input type="text" class="form-control" v-model="show.show_name" required>
        </div>
        <div class="form-group">
          <label for="showRating">Show Rating:</label>
          <input type="number" class="form-control" v-model="show.show_rating" required>
        </div>
        <div class="form-group">
          <label for="showTiming">Show Timing:</label>
          <input type="text" class="form-control" v-model="show.show_timing" required>
        </div>
        <div class="form-group">
          <label for="showTags">Show Tags:</label>
          <input type="text" class="form-control" v-model="show.show_tags" required>
        </div>
        <div class="form-group">
          <label for="showPrice">Show Price:</label>
          <input type="number" class="form-control" v-model="show.show_price" required>
        </div>
       
        <div class="form-group">
          <label for="bookedTickets">Booked Tickets:</label>
          <input type="number" class="form-control" v-model="show.booked_tickets" required>
        </div>
        <button type="submit" class="btn btn-primary">Update Show</button>
        <button @click="cancelEdit" class="btn btn-secondary">Cancel</button>
      </form>
    </div>
  `,
  data() {
    return {
      show: {
        show_id: null,
        show_name: '',
        show_rating: '',
        show_timing: '',
        show_tags: '',
        show_price: '',
        total_tickets: '',
        booked_tickets: '',
      },
    };
  },
  created() {
    const theatreId = this.$route.params.theatre_id;
    const showId = this.$route.params.show_id;
    this.fetchShowData(theatreId);
  },
  methods: {
    fetchShowData(theatreId) {
      fetch(`/get_shows/${theatreId}`)
        .then((response) => response.json())
        .then((data) => {
          const showId = this.$route.params.show_id;
          const show = data.shows.find((item) => item.show_id === Number(showId));
          if (show) {
            this.show = { ...show }; // Update show data in the component
          } else {
            console.error('Show not found');
          }
        })
        .catch((error) => {
          console.error('Error fetching show data:', error);
        });
    },
    updateShow() {
      const theatreId = this.$route.params.theatre_id;
      const showId = this.show.show_id;
  
    
      fetch(`/update_show/${theatreId}/${showId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.show),
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then((data) => {
          console.log(data.message);
          this.$router.push({ path: `/get_shows/${theatreId}` });
        })
        .catch((error) => {
          console.error('Error updating show data:', error);
        });
    },
    cancelEdit() {
      // Notify the parent component that editing is finished (cancel)
      this.$emit("onFinishEdit");
    },
  },
});


const BookTickets=Vue.component("book_tickets",
{
template:`
<div>
  <div style="display: flex;">
  
    <div style="margin: 0 auto;margin-top:3rem;">
    <h2>Book Tickets for <i style="color:red">"{{ show.show_name }}"</i></h2>
    <br>
      <div>
      <h4>Theatre : <i style="color:orange">{{show.theatre.theatre_name}}</i></h4>
       <h4> <label for="numTickets">Needed Tickets  :  </label><input type="number" v-model="numTickets" @input="updateTotalPrice" min="1" :max="maxTickets"></h4>
      
        
      </div>
      <h4><p>Total Price: <i style="color:orange">{{ totalPrice }}</i></p></h4>
      <button @click="bookTickets" class="btn btn-success">Confirm Booking</button>
      <br>
      <img src="static/ticket.jpg" style="width: 400px; height: 300px;" />
    </div>
    <div>
      <img src="static/ticketbooth.png" style="width: 300px; height: 550px;" />
    </div>
  </div>
</div>
`
,
data() {
return {
  numTickets: 1,
  maxTickets: 10,
  show: {},
  totalPrice: 0,
};
},
created() {

const theatreId = parseInt(this.$route.params.theatre_id);
const showId = parseInt(this.$route.params.show_id);

console.log("Theatre ID:", theatreId);
console.log("Show ID:", showId);


fetch(`/get_shows/${theatreId}`)
  .then(response => response.json())
  .then(data => {
    console.log("API Response:", data); 
    
    this.show = data.shows.find(show => show.show_id === showId);
    console.log("Found Show:", this.show); 
    if (this.show) {
      this.maxTickets = this.show.total_tickets;
    } else {
      console.error("Show not found for the specified theatre");
    }
  })
  .catch(error => {
    console.error("Error fetching show details:", error);
  });
},


methods: {
updateTotalPrice() {
  this.totalPrice = this.numTickets * this.show.show_price;
},
bookTickets() {

  const theatreId = this.$route.params.theatre_id;
  const showId = this.$route.params.show_id;
  const bookingData = {
    num_tickets: this.numTickets,
    show_id: this.show.show_id,
  };
  
  
  fetch(`/book_tickets/${theatreId}/${showId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
     
    },
    body: JSON.stringify(bookingData),
  })
  .then(response => response.json())
  .then(data => {
    
    console.log(data);
  
    
    this.$router.push({ path: '/my_bookings' });
    alert(data.message)
  })
  .catch(error => {
    
    console.error("Error booking tickets:", error);
  });
},

},
  
});


const MyBookings = Vue.component("my_bookings", {
  template: `
    <div class="container mt-2">
      <h2 v-if="userRole !== 'admin' && userRole !== 'user'">Please Login to access this page !!!</h2>
      <div v-else>
        <div class="float-end" v-if="bookings.length > 0">
        <br>  
          <h5>Username: <i style="color:red;">{{ bookings[0].username }}</i></h5>
          <h5>Email: <i style="color:green;">{{ bookings[0].email }}</i></h5>
        </div>
        
        <h2 class="mb-4">My<img src="static/ticket.jpg" style="width: 150px; height: 110px;"/>Bookings</h2>
  
        <div v-if="bookings.length > 0" class="table-responsive">
          <table class="table table-bordered table-striped">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Show Name</th>
                <th>Show Timing</th>
                <th>Theatre Name</th>
                <th>Theatre Location</th>
                <th>Booked Tickets</th>
                <th>Total Cost</th>
                <th>Show Status</th>
                <th>Booked Timestamp</th>
                
                <th>Cancel Booking</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="booking in bookings" :key="booking.booking_id">
                <td>{{ booking.booking_id }}</td>
                <td>{{ booking.show_name }}</td>
                <td>{{ booking.show_timing }}</td>
                <td>{{ booking.theatre_name }}</td>
                <td>{{ booking.location }}</td>
                <td>{{ booking.total_tickets }}</td>
                <td>{{ booking.total_price }}</td>
                <td> {{booking.show_status}}</td>
                <td>{{ booking.timestamp }}</td>
               <td>
                  <button v-if="booking.show_status==='Upcoming'" class="btn btn-danger" @click="deleteBooking(booking.booking_id)">Cancel</button>
                  <button v-else  class="btn btn-dark">Ended</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else>No Bookings</p>
      </div>
    </div>
  `,
  data() {
    return {
      bookings: [],
      userRole: null,
    };
  },
  created() {
    
    this.userRole = this.getUserRoleFromCookie();
    this.fetchBookings();
  },
  methods: {
    getUserRoleFromCookie() {
    
      const cookies = document.cookie.split("; ");
      for (const cookie of cookies) {
        const [name, value] = cookie.split("=");
        if (name === "user_role") {
          return value;
        }
      }
      return null;
    },
    fetchBookings() {
    
      fetch('/my_bookings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
      
        },
      })
        .then((response) => response.json())
        .then((data) => {
          this.bookings = data.bookings;
        })
        .catch((error) => {
          console.error('Error fetching bookings:', error);
        });
    },
    async deleteBooking(bookingId) {
      const confirmation = confirm("Are you sure you want to delete this booking?");
      if (confirmation) {
        try {
          const response = await fetch(`/delete_booking/${bookingId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
           
            },
          });
    
          const data = await response.json();
    
          if (data.success) {
         
            this.fetchBookings();
           
          } else {
            alert(data.message);
          }
        } catch (error) {
          console.error('Error deleting booking:', error);
          alert('An error occurred while deleting the booking. Please try again later.');
        }
      }
    },
    
    
    
    
    
  },
});


const SearchBar = Vue.component("search-bar", {
template: `
  <div style="margin-left:30rem;">
    <form @submit.prevent="searchShows" style="border-radius:10rem;">
      <input type="text" style="border-radius:5px;" v-model="searchQuery"  placeholder="Search shows...">
      <select style="margin-left:0.5rem;border-radius:5px;height:1.8rem" v-model="selectedParamType">
        <option value="location">Location</option>
        <option value="tags">Tags</option>
        <option value="name">Show Name</option>
      </select>
      <button type="submit" class="btn btn-success btn-sm "  style="margin-left:0.5rem;margin-bottom:5px;">Search</button>
    </form>
  </div>
`,
data() {
  return {
    searchQuery: '',
    selectedParamType: 'location', 
  };
},
methods: {
  searchShows() {
    console.log('Searching for:', this.searchQuery);
    console.log('Parameter Type:', this.selectedParamType);
    
    this.$emit('search', {
      [this.selectedParamType]: this.searchQuery,
    });
  },
},
});

const SearchResultPage = Vue.component("search-result-page", {
  props: {
    searchResults: {
      type: String,
      default: "[]",
    },
  },
  data() {
    return {
      searchData: [],
      userRole: null,
    };
  },

  watch: {
    searchResults: {
      handler(newSearchResults) {
        try {
          this.userRole = this.getUserRoleFromCookie()
          this.searchData = JSON.parse(newSearchResults);
        } catch (error) {
          console.error("Error parsing searchResults JSON:", error);
          this.searchData = [];
        }
      },
      immediate: true, // Watch the prop immediately when the component is created
    },
  },
  
  methods: {
    navigateToSearchResults(newSearchResults) {
      const currentQuery = { ...this.$route.query };
      const newQuery = { searchResults: newSearchResults };
  
      const isQueryChanged = JSON.stringify(currentQuery) !== JSON.stringify(newQuery);
  
      if (isQueryChanged) {
        this.$router.replace({ path: '/search_results', query: newQuery });
      }
     
    },
    getUserRoleFromCookie() {
      const cookies = document.cookie.split("; ");
      for (const cookie of cookies) {
        const [name, value] = cookie.split("=");
        if (name === "user_role") {
          return value;
        }
      }
      return null;
    },
  },
  
    
  template: `
    <div style="margin-left:4rem;">
    <h2 v-if="userRole !== 'admin' && userRole !== 'user'">Please Login to access this page !!!</h2>
    <div v-else>
      <h2>Search Results Page</h2>
      <div v-if="searchData.length === 0">
        <p>No results found.</p>
      </div>
      <div v-else>
        <div class="row">
          <div class="col-md-4 mb-4" v-for="show in searchData" :key="show.show_id">
            <div class="card border-dark">
              <div class="card-header bg-dark">
                <h5 class="text-light">{{ show.show_name }}</h5>
              </div>
              <div class="card-body">
              <p class="card-text"> <b>Theatre:</b> {{ show.theatre.theatre_name }}
              <p class="card-text"> <b>Location:</b> {{ show.theatre.venue_location }} 
              <p class="card-text"><b>Status:</b>  {{ show.show_status }}</p>
              <p class="card-text"><b>Rating:</b> {{ show.show_rating }}</p>
                <p class="card-text"><b>Timing:</b> {{ show.show_timing }}</p>
                <p class="card-text"><b>Tags:</b>  {{ show.show_tags }}</p>
              
                <ul class="list-group">
                
                  (Price: {{ show.show_price }}, Total Tickets: {{ show.total_tickets }},
                <b>  Available Tickets: {{ show.total_tickets - show.booked_tickets }})</b>
                <router-link v-if="show.show_status=='Upcoming' && show.total_tickets - show.booked_tickets > 0" :to="'/book_tickets/' + show.theatre.theatre_id + '/' + show.show_id" class="btn btn-primary">Book Tickets</router-link>
                  
                <button v-if="show.show_status=='Upcoming' && show.total_tickets - show.booked_tickets <= 0" class="btn btn-danger">Housefull</button>
              
              </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
      <router-link to="/shows/" class="btn btn-primary">
      Go to all shows
    </router-link>
    </div>
    </div>
  `,
});



const routes=[
  {
      path:"/",
      component:Home
  },
  {
      path:"/theatres",
      component:Theatre
  },
  {
      path:"/shows",
      component:Shows
  },
  {
      path:"/get_shows/:theatre_id",
      component:Get_Shows,
     
  },
  {
      path:"/register",
      component:Register
  },
  {
      path:"/login",
      component:Login
  },
  {
      path:"/logout",
      component:Logout
  },
  {
      path:"/add_theatre",
      component:AddTheatre
  },
  {
    path: "/update_theatre/:theatre_id",
    component: UpdateTheatre,
    props: true, 
  },
  {
    path: "/delete_theatre/:theatre_id",
    component: DeleteTheatre,
  },
  {
      path:"/add_show/:theatre_id",
      component:Add_Show,
    
  },
  {
    path:"/update_show/:theatre_id/:show_id",
    component:UpdateShow,
 
},
{
  path:"/book_tickets/:theatre_id/:show_id",
  component:BookTickets,

},
{
path:"/my_bookings",
component:MyBookings,
},
{
  path: '/search_results',
  component: SearchResultPage,
  props: (route) => ({ searchResults: route.query.searchResults }),
},

]


const router=new VueRouter({
  routes
})


const a = new Vue({
el: "#app",
router: router,
data: {
  message: "Hello Badhri",
  isLoggedIn: false,
  searchResults: [],
},
methods: {
  logoutUser() {
    fetch("/logout", {
      method: "POST",
    })
      .then((response) => {
        if (response.status === 200) {
       
          console.log("Logout successful");
    
          this.$router.push({ path: "/login" });
        } else {
          console.error("Logout failed");
        }
      })
      .catch((error) => {
        console.error("Error during logout:", error);
      });
  },
  onSearch(query) {
    console.log('Query sent:', query);
    
    this.getSearchResults(query);
  },
  getSearchResults(query) {
    const queryString = Object.keys(query)
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
      .join('&');
  
    const apiUrl = '/search_shows';
    fetch(`${apiUrl}?${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('Search results received:', data);
  
        // Update the searchResults in the root Vue instance
        this.searchResults = data.shows;
        
       
        this.$router.push({ path: '/search_results', query: { searchResults: JSON.stringify(this.searchResults) } });
      })
      .catch((error) => {
        console.error('Error fetching search results:', error);
      });
  },
  
},
});



function checkIfUserIsLoggedIn() {
  const access_token = getCookie("access_token");
  return access_token ? true : false;
}

function getCookie(name) {
  const value = "; " + document.cookie;
  const parts = value.split("; " + name + "=");
  if (parts.length === 2) return parts.pop().split(";").shift();
}

router.beforeEach((to, from, next) => {
  
  const isLoggedIn = checkIfUserIsLoggedIn(); 
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

  if (requiresAuth && !isLoggedIn) {
  
    next({ path: "/login" });
  } else {
    a.isLoggedIn = isLoggedIn;
    next();
  }
});




