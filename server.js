const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser')
const mongoose = require('mongoose');

// Connect MongoDB

// Create User Schema
const userSchema = new mongoose.Schema({
  username: { type: String}
});

// Create User Schema
const exerciseSchema = new mongoose.Schema({
  userId: String,
  duration: { type: Number, required: true },
  description: { type: String, required: true },
  date: Date
});

const Exercise = mongoose.model("Exercise", exerciseSchema);
const User = mongoose.model("User", userSchema);

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Add new User
app.post("/api/users", (req, res) => {
  const { username } = req.body;

  User.findOne({ username }, (err, foundUser) => {
    if(foundUser) {
      res.send("Username Already taken");
    } else if(username != "") {

      // Create new username Object
      const newUser = new User({ username: username});
      
      // Save to DB
      newUser.save((err, data) => {
        if(err) console.log(err);
        res.json({
          "username": username, "_id": data.id
        })
      });
    } else {
      res.send("Please enter a username!");
    }
  })
});


// Add new Exercise
app.post("/api/users/:_id/exercises", (req, res) => {
  const userId = req.params._id;
  const { duration, description } = req.body;
  let date = req.body.date ? new Date(req.body.date) : new Date();

  if(userId && duration && description) {
    // Get user ID
    User.findById(userId, (err, userFound) => {
      if (!userFound) {
        res.send("Unknown userId");
      } else {
        // Get username of user find by ID | username
        const getUsername = userFound.username;

        // Create new Object
        const newExercise = new Exercise({
          userId, 
          getUsername, 
          "date": date.toDateString(), 
          duration, 
          description
        });

        // Save to DB
        newExercise.save((err, saveData) => {
          if(err) console.log(err);
          // Send response from DB
           res.json({
            "_id": userId, 
            "username": getUsername,
            "date": date.toDateString(), 
            "duration": parseInt(duration), 
            description
          });

        });
      }
    });

  } else {
    res.send("Please fill in all required fields.");
  }
});

// GET /api/users/:_id/logs
app.get("/api/users/:_id/logs", (req, res) => {
  const userId = req.params._id, {limit} = req.query;
  var from = req.query.from ? new Date(req.query.from).getTime() : new Date("1111-11-11").getTime();
  var to = req.query.to ? new Date(req.query.to).getTime() : new Date().getTime();

  // Find User base on user ID
   User.findById(userId, (err, data) => {
    // if error 
    if (err) console.log(err);
    // If no found user
    if (!data) {
      res.send("Unknown userId");
    } else {
      // get found user username
      const username = data.username;

      // Find exercise base on UserId
      Exercise.find({"userId": userId})
        .select(["description", "date", "duration"]).limit(+limit).sort({date: -1}).exec((err, data) => {
          if(err) console.log(err);
          let count = 0;
          let customData = data
            .filter(fdata=>{
              let newEle = new Date(fdata.date).getTime();
              if(newEle >= from && newEle <=to) count++;
              return newEle >= from && newEle <=to;
            })
            .map(mdata=> {
              let newDate = new Date(mdata.date);
              let dateToString = newDate.toDateString();
              // let newDate = new Date(mdata.date).toDateString();
              return { description: mdata.description, duration: mdata.duration, date: dateToString};
            });

          // log custom data
          console.log('customData', customData);

          if (!data) {
              res.json({
              "_id": userId,
              "username": username,
              "count": 0,
              "log": []
            });
          } else {
              res.json({
              "_id": userId,
              "username": username,
              "count": count,
              "log": customData
            });
          }
      });
    }
  })
    
});

// Get All users
app.get('/api/users', (req, res) => {
  User.find({}).select(["_id", "username"]).exec((err, users) => {
    res.json(users);
  });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
