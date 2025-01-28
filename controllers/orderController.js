const User = require("../db/Users");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const APIFeatures  = require("../utils/APIFeatures");
const Order = require("../db/Order");

exports.create_order = catchAsync(async (req, res) => {
   const { company_name,
      customer_order_no,
      customer,
      shipping_details,
      carrier,
      carrier_amount,
      carrier_amount_currency,
      payment_status,
      payment_status_date,
      payment_method,
      carrier_payment_status,
      carrier_payment_date,
      carrier_payment_method,
      revenue_items,
      // order status
      order_status,
    } = req.body;

   const order = await Order.create({
      company_name,
      customer : customer,
      created_by : req.user._id,
      customer_order_no : parseInt(customer_order_no),
      shipping_details,
      carrier,
      carrier_amount,
      carrier_amount_currency,
      payment_status,
      payment_status_date,
      payment_method,
      carrier_payment_status,
      carrier_payment_date,
      carrier_payment_method,
      revenue_items,
      order_status
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
     }).populate(['created_by', 'customer', 'carrier']),
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

exports.order_listing_account = catchAsync(async (req, res) => {
   const Query = new APIFeatures(
     Order.find({
       deletedAt : null || ''
     }).populate(['created_by', 'customer', 'carrier']),
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
