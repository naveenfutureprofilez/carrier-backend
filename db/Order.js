const { default: mongoose } = require('mongoose');
const mongo = require('mongoose'); 
const schema = new mongo.Schema({
    company_name:{ 
        type:String,
        require:true,
    },
    added_by: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    order_no:  {
        type:Number,
        unique:true,
        min: 0,
    },
    
    // Payment status
    payment_status :{
        type:String,
        default:"pending",
    },
    order_amount:  {
        type:Number,
        min: 0,
    },
    order_amount_currency:  {
        type:String,
    },

    // carrier information 
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'customers'},
    carrier: { type: mongoose.Schema.Types.ObjectId, ref: 'carriers'},
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'drivers'},

    // Shipping details
    commudity:String,
    equipment:String,
    weight:{
        type:Number,
        min:0
    },
    weight_unit:{type:String},

    // Pickup Location
    pickup_location: String,
    pickup_phone: String,
    pickup_reference_no:String,
    pickup_date:{type: Date},
    pickup_is_appointment: { 
        type:Number,
        min:0
    },

    // Delivery Location
    delivery_location: String,
    delivery_reference_no:String,
    delivery_date: { type: Date},
    delivery_is_appointment: {
        type:Number,
        min:0
    },
    revenue_items: [],

    

    createdAt: {
        type: Date,
        default: Date.now()     
    },
}); 
 

module.exports = mongo.model('orders', schema);