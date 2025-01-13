const User = require("../db/Users");
const catchAsync = require("../utils/catchAsync");
const crypto = require("crypto");
const JSONerror = require("../utils/jsonErrorHandler");
const logger = require("../utils/logger");
const Driver = require("../db/Driver");
  
const addDriver = catchAsync(async (req, res, next) => {
   const { name, phone, email } = req.body;
   let driverID;
   let isUnique = false;
   while (!isUnique) {
      driverID = `DR_ID${Math.floor(100000 + Math.random() * 900000)}`;
      const existingUser = await Driver.findOne({ driverID });
      if (!existingUser) {
         isUnique = true;
      }
   }
  await Driver.syncIndexes();
  Driver.create({
    name: name,
    phone: phone,
    email: email,
    driverID: driverID,
    created_by:req.user._id,
  }).then(result => {
    res.send({
      status: true,
      driver :result,
      message: "Driver has been added.",
    });
  }).catch(err => {
    JSONerror(res, err, next);
    logger(err);
  });
});

const driversLists = catchAsync(async (req, res, next) => {
   try { 
      const lists = await Driver.find({
         deletedAt : null || ''
      }).populate('created_by');
      Driver.syncIndexes();
      
      if(lists && lists.length > 0){
         res.send({
            status: true,
            drivers :lists,
         });
         }
         else {
         res.send({
            status: false,
            drivers :[],
         });
      }
   } catch (err) {
      res.send({
         status: false,
         drivers :[],
         error :err,
      });
   }
});

module.exports = {  addDriver, driversLists };
