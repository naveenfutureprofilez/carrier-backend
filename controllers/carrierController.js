const catchAsync = require("../utils/catchAsync");
const APIFeatures  = require("../utils/APIFeatures");
const Carrier = require("../db/Carrier");
const JSONerror = require("../utils/jsonErrorHandler");
const logger = require("../utils/logger");
const axios = require("axios");

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

exports.deleteCarrier = catchAsync(async (req, res) => {
    try {
      const carrier = await Carrier.findById(req.params.id);
      if (!carrier) {
        return res.status(404).json({
          status: false,
          error: 'Carrier not found.',
        });
      }
      
      carrier.deletedAt = Date.now();
      const result = await carrier.save();
      if (result) {
        return res.status(200).json({
          status: true,
          message: `Carrier has been removed.`,
          carrier: result,
        });
      } else {
        return res.status(400).json({
          status: false,
          carrier: null,
          error: 'Something went wrong in removing the carrier. Please try again.',
        });
      }
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
      error: error
    });
  }
});

exports.updateCarrier = catchAsync(async (req, res, next) => {
  try { 
    const { name, phone, email, location } = req.body;
    console.log("req.params.id",req.params.id)
    const updatedUser = await Carrier.findByIdAndUpdate(req.params.id, {
      name: name,
      email: email,
      location: location,
      phone: phone
    }, {
      new: true, 
      runValidators: true,
    });
    if(!updatedUser){ 
      res.send({
        status: false,
        carrier : updatedUser,
        message: "failed to update carrier information.",
      });
    } 
    res.send({
      status: true,
      error :updatedUser,
      message: "Carrier has been updated.",
    });

  } catch (error) {
    res.send({
      status: false,
      error :error,
      message: "Failed to update carrier information.",
    });
  }
});

exports.getDistance = async (req, res) => {
  const { start, end, CurrentLocation } = req.body;
  console.log("process.env.GOOGLE_API_KEY",process.env.GOOGLE_API_KEY);
  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${start}&destination=${end}&key=${process.env.GOOGLE_API_KEY}`
      await axios.get(url).then(response => {
          res.json({
              success: true,
              message: "Succees",
              response: response
              // data: response?.data?.routes[0]?.legs.distance.value
          });
      }).catch(error => {
          res.status(400).json({
              success: false,
              error : error,
              message: 'Failed to fetch directions from Google Maps API',
          });
      });
  } catch (error) {
      console.error('Error fetching directions:', error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
