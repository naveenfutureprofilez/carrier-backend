const User = require("../db/Users");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");
const APIFeatures  = require("../utils/APIFeatures");
const Order = require("../db/Order");

exports.create_order = catchAsync(async (req, res) => {
   const { company_name, carrier, added_by, order_no, commudity,equipment,
      weight, weight_unit, pickup_location, pickup_reference_no, pickup_date, pickup_is_appointment,
      delivery_location, delivery_reference_no, delivery_date, delivery_is_appointment, revenue_items } = req.body;

      console.log('req.body', req.body);
   const order = await Order.create({
      company_name,
      carrier : req.user._id,
      added_by : req.user._id,
      order_no : parseInt(order_no),
      commudity,
      equipment,
      weight : parseInt(weight),
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
