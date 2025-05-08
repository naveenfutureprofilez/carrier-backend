const { default: mongoose } = require('mongoose');
const mongo = require('mongoose'); 
const schema = new mongo.Schema({
    // customer_order_no:  {
    //     type:String,
    //     minlength: 1,
    //     required:[true, 'Please enter customer order number.'],
    // }, 

    company_name:{ 
        type:String,
        required:true,
    },
    serial_no:  {
        type: Number,
        unique:true,
        min: 0,
    },
    
    shipping_details : [],
    
    // Customer
    customer: { 
        type: mongoose.Schema.Types.ObjectId, ref: 'customers',
        required:[true, 'Please enter customer details.'],
    },
    customer_payment_status :{
        type:String,
        default:"pending",
    },
    customer_payment_date :{
        type: Date
    },
    customer_payment_method :{
        type: String,
    },
    total_amount: {
        type:Number,
        required:[true, 'Please enter total amount of this order.'],
    },
    lock : {
        type: Boolean,
        default: false
    },

    customer_payment_approved : {
        type: Number,
        default: 0 // 0 not approved, 1 approved, 2 rejected
    },
    customer_payment_approved_by_admin : {
        type: Number,
        default: 0 // 0 not approved, 1 approved, 2 rejected
    },
    carrier_payment_approved : {
        type: Number,
        default: 0 // 0 not approved, 1 approved, 2 rejected
    },
    carrier_payment_approved_by_admin : {
        type: Number,
        default: 0 // 0 not approved, 1 approved, 2 rejected
    },

    // Carrier
    carrier: { 
        type: mongoose.Schema.Types.ObjectId, ref: 'carriers',
        required:[true, 'Please enter carrier details.'],
    },
    carrier_payment_status :{
        type:String,
        default:"pending",
    },
    carrier_payment_date :{
        type: Date
    },
    carrier_payment_method :{
        type: String
    },
    carrier_amount:  {
        type:Number,
        required:[true, 'Please enter selling amount of this order.'],
    },
    
    
    totalDistance : { 
        type: Number,
        // required:[true, 'Please enter total distance of this order.'],
    },

    revenue_items: [],
    carrier_revenue_items: [],
    revenue_currency:{
       type: String,
       default:"cad",
    },
    order_status :{
        type: String,
        default:"added",
    },

    // Notes
    notes : {
        type: String,
    },
    carrier_payment_notes : { 
        type: String
    },
    customer_payment_notes : { 
        type: String
    },
    
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    createdAt: {
        type: Date,
        default: Date.now()   
    },

    deletedAt: {
        type: Date,
    },
    updatedAt: {
        type: Date,
    },
},{
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
}); 

// schema.virtual('gross_amount').get(function () {
//     const items = this.revenue_items || [];
//     let grossAmount = 0;
//     items.forEach(item => {
//         grossAmount += Number(item.value);
//     });
//     return grossAmount;
// });

schema.virtual('profit').get(function () {
    const total_amount = this.total_amount || 0;
    const commission = total_amount * (this.created_by.staff_commision /100);
    const actualProfit = total_amount - commission - this.carrier_amount;
    return actualProfit;
});

schema.virtual('commission').get(function () {
    const total_amount = this.total_amount || 0;
    const commission = total_amount * (this.created_by.staff_commision /100);
    return commission;
});


module.exports = mongo.model('orders', schema);

 