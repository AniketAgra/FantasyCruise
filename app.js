const fs = require('fs');
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose  = require('mongoose');

const placesRoutes = require("./routes/places-routes");
const usersRoutes = require('./routes/users-routes');
const HttpError = require('./models/http-error');


const app = express();

app.use(bodyParser.json());

app.use('/uploads/images', express.static(path.join('uploads','images')))

app.use((req,res,next) =>{
    res.setHeader('Access-Control-Allow-Origin','*');   // * -- so that can be accessed by any domain -- not only aparticular domain/localhost
    res.setHeader('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');
    next();
})

app.use('/api/places',placesRoutes);   //using our exported route  --- => /api/places/...  (here we can add the path)
app.use('/api/users',usersRoutes);

app.use((req,res,next) => {
    const error = new HttpError('Could not find this route.',404);
    throw error;         //synchronous so nothing flowing against it
})

//If we provide a middleware function that takes four parameters --then Express js will recognize it and treat it as a special middleware function
//error handling middleware
app.use((error,req,res,next)=>{        //it will be only executed on request that have an error attached to it. --> execute if any middleware infront of it yields an error

    if(req.file){
      fs.unlink(req.file.path, (err) => {       //to remove a file -- i.e not image is uploaded until a new user created successfully
        console.log(err);
      })
    }

    if(res.headerSent){
        return next(error);
    }
    res.status(error.code || 500)
    res.json({message: error.message || "An unknown error occured!"})
});     

mongoose
.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@chat.5ojvxi4.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=chat`)
.then(() => {
    app.listen(4000);
    console.log("MongoDB Connected Successfully.")
})
.catch(err => {
    console.log(err);
});
