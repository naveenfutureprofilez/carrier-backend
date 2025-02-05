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
      new_updated_pickup,
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
   try {
      const { search } = req.query;
      let filter = { deletedAt: { $in: [null, ""] } };
      if (search) {
         filter.$or = [
            { customer_order_no: { $regex: search } },
            // { title: { $regex: search, $options: "i" } }  // Case-insensitive search in title
         ];
      }
      console.log("filter", { $regex: search });
      const Query = new APIFeatures(
         Order.find(filter).populate(["created_by", "customer", "carrier"]),
         req.query
      ).sort();

      const { query, totalDocuments, page, limit, totalPages } = await Query.paginate();
      const data = await query;

      res.json({
         status: true,
         orders: data,
         totalDocuments,
         page,
         limit,
         totalPages,
         message: data.length ? undefined : "No orders found",
      });
   } catch (error) {
      res.status(500).json({
         status: false,
         message: "Something went wrong",
         error: error.message,
      });
   }
});

exports.updateOrderPaymentStatus = catchAsync(async (req, res) => {
   try { 
      const { status, method } = req.body;
      let order;
      if(req.params.type === 'customer'){
         order = await Order.findByIdAndUpdate(req.params.id, {
            payment_status : status,
            payment_status_date  : Date.now(),
            payment_method : method,
         }, {
           new: true, 
           runValidators: true,
         });
      } else { 
         order = await Order.findByIdAndUpdate(req.params.id, {
            carrier_payment_status :status,
            carrier_payment_date : Date.now(),
            carrier_payment_method : method,
         }, {
           new: true, 
           runValidators: true,
         });
      }
      if(!order){ 
        res.send({
          status: false,
          carrier : order,
          message: "failed to update order information.",
        });
      } 
      res.send({
        status: true,
        error :order,
        message: "Payment status has been updated.",
      });
  
    } catch (error) {
      res.send({
        status: false,
        error :error,
        message: "Failed to update order information.",
      });
    }
});

exports.updateOrderStatus = catchAsync(async (req, res) => {
   try { 
      const { status } = req.body;
      const order  = await Order.findByIdAndUpdate(req.params.id, {
         order_status : status,
         updatedAt : Date.now(),
      }, {
         new: true, 
         runValidators: true,
      });
      if(!order){ 
        res.send({
          status: false,
          carrier : order,
          message: "failed to update order information.",
        });
      } 
      res.send({
        status: true,
        error :order,
        message: "Order status has been updated.",
      });
    } catch (error) {
      res.send({
        status: false,
        error :error,
        message: "Failed to update order information.",
      });
    }
});


exports.addnote = catchAsync(async (req, res) => {
   try { 
      const { notes } = req.body;
      console.log("req.params.id",req.params.id)
      const order  = await Order.findByIdAndUpdate(req.params.id, {
         notes : notes,
         updatedAt : Date.now(),
      }, {
         new: true, 
         runValidators: true,
      });
      if(!order){ 
        res.send({
          status: false,
          carrier : order,
          message: "failed to add note on this order.",
        });
      } 
      console.log("order",order)
      res.send({
        status: true,
        error :order,
        message: "Note has been added.",
      });
    } catch (error) {
      res.send({
        status: false,
        error :error,
        message: "Failed to update order information.",
      });
    }
});

exports.overview = catchAsync(async (req, res) => {
   const totalLoads = await Order.countDocuments();
   const intransitLoads = await Order.countDocuments({ order_status: 'intransit'});
   const completedLoads = await Order.countDocuments({ order_status: 'completed'});
   const pendingLoads = await Order.countDocuments({ order_status: 'added'});
   const pendingPayments = await Order.countDocuments({ carrier_payment_status: { $ne: 'paid' } });
   res.json({
   status: true,
   message: 'Dashboard data retrieved successfully.',
   lists: [
      { title : 'Total Loads', data: totalLoads, link:"none" },
      { title : 'Intransit Loads', data: intransitLoads, link:"none" },
      { title : 'Completed Loads', data: completedLoads, link:"none" },
      { title : 'Pending Loads', data: pendingLoads, link:"none" },
      { title : 'Pending Payments', data: pendingPayments, link:"none" },
   ] 
   });
 });

 



 