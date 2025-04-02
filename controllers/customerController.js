const catchAsync = require("../utils/catchAsync");
const APIFeatures  = require("../utils/APIFeatures");
const Customer = require("../db/Customer");
const JSONerror = require("../utils/jsonErrorHandler");
const logger = require("../utils/logger");

exports.addCustomer = catchAsync(async (req, res, next) => {
  const { name, phone, 
    mc_code, 
    assigned_to,
    secondary_email,
    secondary_phone,
    email, address, country, state, city, zipcode } = req.body;

  const existingCustomer = await Customer.findOne({ 
    $or: [{ mc_code }, { email }] 
  });

  if (existingCustomer) {
    return res.status(200).json({
      status: false,
      message: existingCustomer.mc_code === mc_code 
        ? "MC code exists. Please use a different MC code." 
        : "Email address already exists. Please use a different email.",
    });
  }

  // let customerID;
  // let isUnique = false;
  // while (!isUnique) {
  //    customerID = `CT_ID${Math.floor(10000 + Math.random() * 90000)}`;
  //    const existingUser = await Customer.findOne({ customerID });
      
  //    if (!existingUser) {
  //       isUnique = true;
  //    }
  // }
 await Customer.syncIndexes();
 Customer.create({
   name: name,
   email: email,
   secondary_email: secondary_email,
   secondary_phone: secondary_phone,
   mc_code: mc_code,
   phone: phone,
   address: address,
   country: country,
   state: state,
   city: city,
   zipcode: zipcode,
   assigned_to:assigned_to,
   created_by:req.user._id,
 }).then(result => {
   res.send({
     status: true,
     customers :result,
     message: "Customer has been added.",
   });
 }).catch(err => {
   JSONerror(res, err, next);
   logger(err);
 });
});

exports.customers_listing = catchAsync(async (req, res) => {
  let Query;
  if(req.user && req.user.is_admin == 1){
    Query = new APIFeatures(
      Customer.find({
        deletedAt : null || ''
      }).populate('assigned_to'),
      req.query
    ).sort();
  } else {
    Query = new APIFeatures(
      Customer.find({
        assigned_to : req.user._id,
        deletedAt : null || ''
      }).populate('assigned_to'),
      req.query
    ).sort();
  }
     
  const { query, totalDocuments, page, limit, totalPages } = await Query.paginate();
  const data = await query;
  res.json({
    status: true,
    totalDocuments: totalDocuments,
    customers: data,
    page : page,
    per_page : limit,
    totalPages : totalPages,
    message: data.length ? undefined : "No customers found"
  });
});

exports.updateCustomer = catchAsync(async (req, res, next) => {
  const { name, secondary_email, secondary_phone, mc_code, phone, email, address, country, state, city, zipcode, assigned_to } = req.body;
  
  if (mc_code) {
    const existingCustomer = await Customer.findOne({ mc_code: mc_code, _id: { $ne: req.params.id } });
    if (existingCustomer) {
      return res.status(200).send({
        status: false,
        message: "MC Code must be unique. This MC Code is already in use.",
      });
    }
  }

  await Customer.syncIndexes();
  const updatedUser = await Customer.findByIdAndUpdate(req.params.id, {
    name: name,
    email: email,
    secondary_email: secondary_email,
    secondary_phone: secondary_phone,
    mc_code: mc_code,
    phone: phone,
    address: address,
    country: country,
    state: state,
    city: city,
    assigned_to: assigned_to,
    zipcode: zipcode,
    created_by:req.user._id,
  }, {
    new: true, 
    runValidators: true,
  });

  if(!updatedUser){ 
    res.send({
      status: false,
      customer : updatedUser,
      message: "Failed to update customer information.",
    });
  } 
  res.send({
    status: true,
    error : updatedUser,
    message: "Customer has been updated.",
  });
});

exports.deleteCustomer = catchAsync(async (req, res) => {
    try {
      const customer = await Customer.findById(req.params.id);
      if (!customer) {
        return res.status(404).json({
          status: false,
          error: 'customer not found.',
        });
      }
      customer.deletedAt = Date.now();
      const result = await customer.save();
      if (result) {
        return res.status(200).json({
          status: true,
          message: `customer has been removed.`,
          customer: result,
        });
      } else {
        return res.status(400).json({
          status: false,
          customer: null,
          error: 'Something went wrong in removing the customer. Please try again.',
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
