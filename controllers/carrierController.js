const User = require("../db/Users");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const APIFeatures  = require("../utils/APIFeatures");
const Carrier = require("../db/Carrier");
const JSONerror = require("../utils/jsonErrorHandler");
const logger = require("../utils/logger");


exports.addCarrier = catchAsync(async (req, res, next) => {
  const { name, phone, email, location } = req.body;
  let carrierID;
  let isUnique = false;
  while (!isUnique) {
     carrierID = `CR_ID${Math.floor(100000 + Math.random() * 900000)}`;
     const existingUser = await Carrier.findOne({ carrierID });
     if (!existingUser) {
        isUnique = true;
     }
  }
 await Carrier.syncIndexes();
 Carrier.create({
   name: name,
   email: email,
   location: location,
   phone: phone,
   carrierID: carrierID,
   created_by:req.user._id,
 }).then(result => {
   res.send({
     status: true,
     driver :result,
     message: "Carrier has been added.",
   });
 }).catch(err => {
   JSONerror(res, err, next);
   logger(err);
 });
});

exports.carriers_listing = catchAsync(async (req, res) => {
    const Query = new APIFeatures(
      Carrier.find({
        deletedAt : null || ''
      }).populate('created_by'),
      req.query
    ).sort();
   const { query, totalDocuments, page, limit, totalPages } = await Query.paginate();
   const data = await query;
   res.json({
     status: true,
     carriers: data,
     page : page,
     totalPages : totalPages,
     message: data.length ? undefined : "No files found"
   });
});
