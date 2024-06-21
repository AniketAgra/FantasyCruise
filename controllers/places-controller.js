// try {
//     var uuid = require('uuid/v4');
// } catch (error) {
//     var { v4: uuid } = require('uuid');
// }
const fs = require('fs') ;
const {validationResult} = require('express-validator')

const HttpError =  require( "../models/http-error");
const getCoordsForAddress = require('../util/location');
const Place = require('../models/place');
const User = require('../models/user');
const mongoose = require('mongoose');

// let DUMMY_PLACES = [
//     {
//         id: 'p1',
//         title: 'Empire State Building',
//         description: 'One of the most famous sky scrapers in the world!',
//         location:{
//             lat : 40.7484474,
//             lng: -73.9871516
//         },
//         address: '20 W 34th St, New York, NY 10001',
//         creator: 'u1'
//     }
// ]

// function getPlaceById() { ... }
// const getPlaceById = function() { ... }

const getPlaceById = async (req,res,next) => {                    // colon(:) for dynamic id
    const placeId = req.params.pid.trim();       
                                                            //params is the property that contain a object having key value --> {pid: 'p1'}
    // const place = DUMMY_PLACES.find(p => {
    //     return p.id === placeId;
    // });

    let place;
    try{
        place = await Place.findById(placeId);                         //findById -- is a static method here, ie it is not  used on the instance of place but directly on the place constructor fuction .... as compared to save() method , findById does not return a promise and still async and await will we available.
    }catch(err){
        const error = new HttpError("Something  went wrong, could not find a place.",500);
        return next(error);
    }

    if(!place){
        const error =  new HttpError("Could not find a place for the provided id.",404);
        return next(error);
    }

    res.json({place: place.toObject({getters: true}) });                               //json method instead of send method --> it takes any data which can be converted to valid JSON. For Eg. an array, an object or a number,boolean , string
                                                                                       // {place} is equivalent to {place: place}
}
                                                                                       //order of routes actually matters as if we use only -- /user as a route then on giving any input for this route will not be reached but instead it wll be treated as -- /:pid

const getPlacesByUserId = async (req,res,next) => {
    const userId = req.params.uid.trim();

//Method 0 : Dummy data:
    // const places = DUMMY_PLACES.filter(p => {
    //     return p.creator === userId;
    // });

//Method1 -- the general method:

    // let places;
    // try{
    //     places = await Place.find({ creator : userId });
    // }catch(err) {
    //     console.error(err);
    //     const error = new HttpError("Fetching places failed, please try again later.",500);
    //     return next(error);
    // }

    // if(!places || places.length === 0){
    //     // return next (new HttpError("Could not find places for the provided id.",404))
    //     const error = new HttpError("Could not find places for the provided user id.",404);
    //     return next(error);
    // }

    // res.json({places:places.map(place => place.toObject({ getters: true})) });                 //find returns an array and we cannot use -- toObject -- with an array . So we use -- map -- a standard js method

//method2 -- using populate:

    let userWithPlaces ;
    try{
        userWithPlaces = await User.findById(userId).populate('places');
    }catch(err) {
        const error = new HttpError("Fetching places failed, please try again later.",500);
        return next(error);
    }

    if(!userWithPlaces || userWithPlaces.places.length === 0){
        const error = new HttpError("Could not find places for the provided user id.",404);
        return next(error);
    }

    res.json({places:userWithPlaces.places.map(place => place.toObject({ getters: true})) });
}

const createPlace = async (req,res,next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
                                                                                            //throw new HttpError('Invalid inputs passed, please check your data.',422)          since working with asynchronous code -- throw will not work properly
        return next(new HttpError('Invalid inputs passed, please check your data.',422));
    }

    const {title, description, address}= req.body;
                                                                                            //const title = req.body.title;   -- long method

    let coordinates;
    try{
        coordinates = await getCoordsForAddress(address);
    }catch(error){
        return next(error);
    }

    // const createdPlace = {
    //     id: uuid(),
    //     title,
    //     description,
    //     location: coordinates,
    //     address,
    //     creator               //or title:title
    // }; //will be updated with mongoDb logic

    const createdPlace = new Place({
        title,
        description,
        address,
        location: coordinates,
        image:req.file.path,
        creator: req.userData.userId
    });

    let user;
    try{
        user = await User.findById(req.userData.userId);
    }catch(err){
        const error = new HttpError('Creating place failed, please try again.',);
        return next(error);
    }

    if(!user){
        const error = new HttpError('Could not find user for provided id',404);
        return next(error);
    }

    console.log(user);

    // DUMMY_PLACES.push(createdPlace);  //unshift(createdPlace)
    try{
        // await createdPlace.save();
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await createdPlace.save({ session: sess});
        user.places.push(createdPlace);         //generally creates and saves a userId
        await user.save({ session: sess});
        await sess.commitTransaction();

    }catch(err) {
        const error = new HttpError(
            'creating place failed, please try again later.',500
        )
        return next(error);
    }

    res.status(201).json({place: createdPlace});
};

const updatePlace = async (req,res,next) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        // throw new HttpError('Invalid inputs passed, please check your data.' ,422);
        return next(new HttpError('Invalid inputs passed, please check your data.' ,422));
    }

    const {title, description}= req.body;
    const placeId = req.params.pid.trim();                                         // pid - also used in  api so pid(the word ) should be same at both the places.
    
    // const updatedPlace ={ ...DUMMY_PLACES.find(p => p.id === placeId)};
    // const placeIndex = DUMMY_PLACES.findIndex(p => p.id === placeId);

    let place;

    try {
        place = await Place.findById(placeId);
    } catch(err) {
        const error = new HttpError("Something went wrong, could not update place.",500);
        return next(error);
    }

    //checks wether the place created by user can be updated by that particular user at backend
    if(place.creator.toString() !== req.userData.userId){
        const error = new HttpError("You are not allowed to edit this place.",401);
        return next(error);
    }

    // updatedPlace.title = title;
    // updatedPlace.description = description;

    place.title = title;
    place.description = description;

    // DUMMY_PLACES[placeIndex] = updatedPlace;

    try{
        await place.save();
    } catch (err) {
        const error = new HttpError("Something went wrong, could not update place. ",500);
        return next(error);
    }

    res.status(200).json({place: place.toObject({ getters: true})});
};

const deletePlace = async(req,res,next) => {
    const placeId = req.params.pid.trim();
    

    // if(!DUMMY_PLACES.find(p => p.id === placeId)){
    //     throw new HttpError('Could not find a place for that id.',404);
    // }

    let place;

    try{

        // place = await Place.findById(placeId); --> general method

        // --> populate works only if the connection is made between user and places
        place = await Place.findById(placeId).populate('creator');  //so id allow us to search for the user and then to get back all the data stored int he user document.
    } catch(err){
        const error = new HttpError("Something went wrong, could not delete place.",500);
        return next(error);
    }

    if(!place){
        const error = new HttpError('Could not find the place for this id.',404);
        return next(error); 
    }
    // DUMMY_PLACES = DUMMY_PLACES.filter(p => p.id != placeId);

    if(place.creator.id !== req.userData.userId){
        const error = new HttpError("You are not allowed delete this place.",401);
        return next(error);
    }

    //deleting place image on deleting place
    const imagePath = place.image; 

    try{
        // await place.deleteOne();
        const sess = await mongoose.startSession();
        sess.startTransaction();
        await place.deleteOne({session : sess});
        place.creator.places.pull(place);       //pull will automatically remove the Id so we don't have to explicitly tell Mongoose to remove an id.
        await place.creator.save({session : sess});
        await sess.commitTransaction();
    } catch (err) {
          console.error("Error finding place:", err);
          const error = new HttpError("You can't delete a place which doesn't exists.",500);
          return next(error);
    }

    fs.unlink(imagePath, err => {
        console.log(err);
    });

    res.status(200).json({message: 'Deleted place.'})
                                                            //or
                                                                        // res.status(200).json({message: 'Deleted place.', place})
};

exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
