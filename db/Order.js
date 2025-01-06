const { default: mongoose } = require('mongoose');
const mongo = require('mongoose'); 
const slugify = require('slugify'); 
const schema = new mongo.Schema({
    company_name:{ 
        type:String,
        require:true,
    },
   
    added_by: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    order_no:  {
        type:Number,
        unique:true,
    },
    order_amount:  {
        type:Number,
    },
    order_amount_currency:  {
        type:String,
    },

    // carrier information 
    carrier: { type: mongoose.Schema.Types.ObjectId, ref: 'carrier'},
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'driver'},

    // Shipping details
    commudity:String,
    equipment:String,
    weight:{type:Number},
    weight_unit:{type:String},

    // Pickup Location
    pickup_location: String,
    pickup_phone: String,
    pickup_reference_no:String,
    pickup_date:{type: Date},
    pickup_is_appointment: { type:Number },

    // Delivery Location
    delivery_location: String,
    delivery_reference_no:String,
    delivery_date: { type: Date},
    delivery_is_appointment: {type:Number},
    revenue_items: [],
    createdAt: {
        type: Date,
        default: Date.now()     
    },
}); 
 

module.exports = mongo.model('orders', schema);