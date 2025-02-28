const catchAsync = require("../utils/catchAsync");
const APIFeatures  = require("../utils/APIFeatures");
const Carrier = require("../db/Carrier");
const JSONerror = require("../utils/jsonErrorHandler");
const logger = require("../utils/logger");
const axios = require("axios");
 
exports.addCarrier = catchAsync(async (req, res, next) => {
  const { name, phone, email, location, country, state, city, zipcode } = req.body;
  const existingCarrier = await Carrier.findOne({ 
    $or: [{ email }, { phone }] 
  });
    if (existingCarrier) {
    return res.status(200).json({
      status: false,
      message: existingCarrier.email === email 
        ? "Email already exists. Please use a different email." 
        : "Phone number already exists. Please use a different phone number.",
    });
  }

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
   country: country,
   state: state,
   city: city,
   zipcode: zipcode,
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

    let Query;
    if(req.user && req.user.is_admin == 1){
      Query = new APIFeatures(
        Carrier.find({
          deletedAt : null || ''
        }).populate('created_by'),
        req.query
        ).sort();
    } else {
      Query = new APIFeatures(
        Carrier.find({
          deletedAt : null || '',
          created_by : req.user._id,
        }).populate('created_by'),
        req.query
        ).sort();
    }
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
    const { name, phone, email, location, country, state, city, zipcode, carrierID } = req.body;
    const existingCarrier = await Carrier.findOne({ 
      $or: [{ email }, { phone }],
      carrierID: { $ne: carrierID } 
    });
    if (existingCarrier) {
      return res.status(200).json({
        status: false,
        message: existingCarrier.email === email 
          ? "Email already exists. Please use a different email." 
          : "Phone number already exists. Please use a different phone number.",
      });
    }
    const updatedUser = await Carrier.findByIdAndUpdate(req.params.id, {
      name: name,
      email: email,
      location: location,
      phone: phone,
      country: country,
      state: state,
      city: city,
      zipcode: zipcode,
    }, {
      new: true, 
      runValidators: true,
    });
    if(!updatedUser){ 
      res.send({
        status: false,
        carrier : updatedUser,
        message: "Failed to update carrier information.",
      });
    } 
    res.send({
      status: true,
      error :updatedUser,
      message: "Carrier has been updated.",
    });

  } catch (error) {
    console.log("error",error)
    res.send({
      status: false,
      error :error,
      message: "Failed to update carrier information.",
    });
  }
});

exports.getDistance = async (req, res) => {
  const { start, end } = req.body;
  try {
    const url = `https://api.distancematrix.ai/maps/api/distancematrix/json?origins=${start}&destinations=${end}&key=${process.env.DIMETRIX_KEY}`;
    const response = await axios.get(url);
    if(response?.data?.rows[0]?.elements[0]?.distance?.value){
      res.json({
        success: true,
        message: "Success",
        data: (response?.data?.rows[0].elements[0].distance.value)/1000 || 0
      });
    } else { 
      res.json({
        success: false,
        message: "Unable to calculate distance between all shipping locations. Please check all the locations correctly.",
        data: response?.data?.rows[0].elements[0].distance.value || 0
      });
    }
  } catch (error) {
    console.error("Error fetching directions:", error.message);
    res.status(500).json({
      success: false,
      message: 'Unable to calculate distance. Please check all the locations correctly.',
      error: error.message
    });
  }
};