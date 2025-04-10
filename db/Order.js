const { default: mongoose } = require('mongoose');
const mongo = require('mongoose'); 
const schema = new mongo.Schema({
    company_name:{ 
        type:String,
        required:true,
    },
    serial_no:  {
        type: Number,
        unique:true,
        min: 0,
    },
    customer_order_no:  {
        type:String,
        minlength: 1,
        required:[true, 'Please enter customer order number.'],
    }, 
    customer: { 
        type: mongoose.Schema.Types.ObjectId, ref: 'customers',
        required:[true, 'Please enter customer details.'],
    },
    shipping_details : [],
    carrier: { 
        type: mongoose.Schema.Types.ObjectId, ref: 'carriers',
        required:[true, 'Please enter carrier details.'],
    },
    carrier_amount:  {
        type:Number,
        required:[true, 'Please enter selling amount of this order.'],
    },
    carrier_amount_currency:  {
        type:String,
        default:"cad",
    },
    payment_status :{
        type:String,
        default:"pending",
    },
    payment_status_date :{
        type: Date
    },
    payment_method :{
        type: String,
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
    revenue_items: [],
    revenue_currency:{
       type: String,
       default:"cad",
    },
    order_status :{
        type: String,
        default:"added",
    },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    totalDistance : { 
        type: Number,
        required:[true, 'Please enter total distance of this order.'],
    },
    total_amount: {
        type:Number,
        required:[true, 'Please enter total amount of this order.'],
    },
    notes : {
        type: String,
    },
    carrier_payment_notes : { 
        type: String
    },
    customer_payment_notes : { 
        type: String
    },
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

 