// try {
//     var uuid = require('uuid/v4');
// } catch (error) {
//     var { v4: uuid } = require('uuid');
// }
const {validationResult} = require('express-validator');
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');
const User = require('../models/user');

// const DUMMY_USERS = [
//     {
//         id: 'u1',
//         name: 'Aniket Agrawal',
//         email:'test@test.com',
//         password: 'testers'
//     }
// ]

const getUsers = async(req,res,next) => {
    // res.json({users: DUMMY_USERS});
    let users;

    try{
        users = await User.find({},'-password');  //or const users = await User.find({},'email name');
    }catch(err){
        const error = new HttpError('Fecthing users failed, please try again later.',500);
        return next(error);
    }
    
    res.json({users: users.map(user => user.toObject({ getters: true}))});  //with find method we uses --> map
};

const signup = async(req,res,next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return next(new HttpError('Invalid inputs passed, please check your data.',422)); 
    }

    const {name,email,password} = req.body;

    // const hasUser = DUMMY_USERS.find(u => u.email === email);
    // if(hasUser){
    //     throw new HttpError('Could not create user, email already exists.',422);
    // }

    //mongoose

    let existingUser;

    try{
        existingUser = await User.findOne({ email: email })
    }catch(err){
        const error = new HttpError('Signing up failed, please try again later.',500);
        return next(error);
    }

    if(existingUser){
        const error = new HttpError('User exists already, please login instead.',422);
        return next(error);
    }
    

    // const createdUser = {
    //     id:uuid(),
    //     name,  //name:name
    //     email,
    //     password
    // };

    //mongoose

    let hashedPrassword;

    try{
        hashedPrassword = await bcrypt.hash(password, 12);  //second arg -- no of salting rounds -- defines strength
    }catch(err){
        const error = new HttpError('Could not crete user, please try again.',500);
        return next(error);
    }
    

    const createdUser = new User({
        name,
        email,
        password: hashedPrassword,
        image: req.file.path,
        // places
        places: []
    });

    // DUMMY_USERS.push(createdUser);
    try{
        await createdUser.save();
    }catch(err){
        const error = new HttpError('Signing Up failed, please try again.',500);
        return next(error);
    }

    //token

    let token;

    try{
        token = jwt.sign({userId: createdUser.id, email: createdUser.email}, process.env.JWT_KEY, {expiresIn:'1h'}); //id is a getter by mongoose on every created user document object we're working with
    }catch(err){
        const error = new HttpError('Signing up failed, please try again later.',500);
        return next(error);
    }

    // res.status(201).json({user: createdUser});
    // res.status(201).json({user: createdUser.toObject({getters:true})});
    res.status(201).json({userId: createdUser.id, email: createdUser.email, token: token});
};

const login = async(req,res,next) => {
    const { email,password} = req.body;

    // const identifiedUser = DUMMY_USERS.find(u => u.email === email);
    // if(!identifiedUser || identifiedUser.password !== password){
    //     throw new HttpError('Could not identify user,Credentials seems to be wrong.',401);
    // }
    let identifiedUser;
    try{
        identifiedUser = await User.findOne({email : email});
    }catch(err){
        const error = new HttpError('Logging in failed,please try again later.',500);
        return next(error);
    }



    if(!identifiedUser ){
        const error = new HttpError('Invalid credentials, could not log you in.',403);
        return next(error);
    }

    //checking password using bcrypt
    let isValidPassword = false;
    try{
        isValidPassword = await bcrypt.compare(password, identifiedUser.password);
    }catch(err){
        const error = new HttpError('Could not log you in, check your credentials and try again.',500);
        return next(error);
    }

    if(!isValidPassword){
        const error = new HttpError('Invalid credentials, could not log you in.',401);
        return next(error);
    }

    //token

    let token;
    try {
        token = jwt.sign({userId: identifiedUser.id, email: identifiedUser.email}, process.env.JWT_KEY, {expiresIn:'1h'});
    } catch (err) {
        const error = new HttpError('Logging in failed,please try again later.',401);
        return next(error);
    }

    // res.json({message: 'Logged In',user: identifiedUser.toObject({getters: true})});
    res.json({userId: identifiedUser.id, email: identifiedUser.email, token: token});
};

exports.getUsers = getUsers;
exports.signup = signup;
exports.login = login;