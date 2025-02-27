const catchAsync = require("../utils/catchAsync");
const APIFeatures  = require("../utils/APIFeatures");
const Customer = require("../db/Customer");

exports.addCustomer = catchAsync(async (req, res, next) => {
  const { name, phone, email, address, country, state, city, zipcode } = req.body;
  const existingCustomer = await Customer.findOne({ 
    $or: [{ email }, { phone }] 
  });

  if (existingCustomer) {
    return res.status(200).json({
      status: false,
      message: existingCustomer.email === email 
        ? "Email already exists. Please use a different email." 
        : "Phone number already exists. Please use a different phone number.",
    });
  }

  let customerID;
  let isUnique = false;
  while (!isUnique) {
     customerID = `CT_ID${Math.floor(10000 + Math.random() * 90000)}`;
     const existingUser = await Customer.findOne({ customerID });
      
     if (!existingUser) {
        isUnique = true;
     }
  }
 await Customer.syncIndexes();
 Customer.create({
   name: name,
   email: email,
   phone: phone,
   address: address,
   country: country,
   state: state,
   city: city,
   zipcode: zipcode,
   customerID: customerID,
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
      }).populate('created_by'),
      req.query
    ).sort();
  } else {
    Query = new APIFeatures(
      Customer.find({
        created_by : req.user._id,
        deletedAt : null || ''
      }).populate('created_by'),
      req.query
    ).sort();
  }
     
  const { query, totalDocuments, page, limit, totalPages } = await Query.paginate();
  const data = await query;
  res.json({
    status: true,
    customers: data,
    page : page,
    totalPages : totalPages,
    message: data.length ? undefined : "No customers found"
  });
});
