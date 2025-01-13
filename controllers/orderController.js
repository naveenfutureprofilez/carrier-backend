const User = require("../db/Users");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const APIFeatures  = require("../utils/APIFeatures");
const Order = require("../db/Order");

exports.create_order = catchAsync(async (req, res) => {
   const { company_name, carrier, driver, customer, order_no, commudity,equipment,
      weight, weight_unit, pickup_location, pickup_reference_no, pickup_date, pickup_is_appointment,
      delivery_location, delivery_reference_no, delivery_date, delivery_is_appointment, revenue_items } = req.body;

      console.log('req.body', req.body);
   const order = await Order.create({
      company_name,
      carrier : carrier,
      driver : driver,
      customer : customer,
      added_by : req.user._id,
      order_no : parseInt(order_no),
      commudity,
      equipment,
      weight : parseInt(weight || 0),
      weight_unit,
      pickup_location,
      pickup_reference_no,
      pickup_date : new Date(pickup_date),
      pickup_is_appointment : parseInt(pickup_is_appointment), 
      delivery_location,
      delivery_reference_no,
      delivery_date : new Date(delivery_date),
      delivery_is_appointment : parseInt(delivery_is_appointment),
      revenue_items
   });

   if(!order){
      res.json({
         status:false,
         message: "Failed to create order."
      });
   }
   res.json({
      status:true,
      order,
      message: "Order has been created."
   });

});

exports.order_listing = catchAsync(async (req, res) => {
   const Query = new APIFeatures(
     Order.find({
       deletedAt : null || ''
     }).populate(['created_by', 'customer', 'carrier', 'driver']),
     req.query
   ).sort();
  const { query, totalDocuments, page, limit, totalPages } = await Query.paginate();
  const data = await query;
  res.json({
    status: true,
    orders: data,
    page : page,
    totalPages : totalPages,
    message: data.length ? undefined : "No files found"
  });
});
