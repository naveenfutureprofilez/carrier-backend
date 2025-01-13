const User = require("../db/Users");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const APIFeatures  = require("../utils/APIFeatures");
const Carrier = require("../db/Carrier");
const Customer = require("../db/Customer");


exports.addCustomer = catchAsync(async (req, res, next) => {
  const { name, phone, email } = req.body;
  let customerID;
  let isUnique = false;
  while (!isUnique) {
     customerID = `CT_ID${Math.floor(100000 + Math.random() * 900000)}`;
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
    const Query = new APIFeatures(
      Customer.find({
        deletedAt : null || ''
      }).populate('created_by'),
      req.query
    ).sort();
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
