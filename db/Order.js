const { default: mongoose } = require('mongoose');
const mongo = require('mongoose'); 
const schema = new mongo.Schema({
    company_name:{ 
        type:String,
        require:true,
    },
    customer_order_no:  {
        type:Number,
        unique:true,
        min: 0,
    }, 
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'customers'},


    // Shipping details
    shipping_details : [],
    carrier: { type: mongoose.Schema.Types.ObjectId, ref: 'carriers'},
    carrier_amount:  {type:Number},
    carrier_amount_currency:  {type:String},

    // Order Payment status
    payment_status :{
        type:String,
        default:"pending",
    },
    payment_status_date :{
        type: Date
    },
    payment_method :{
        type: String
    },


    // Carrier Payment
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


    // REVENUE ITEMS
    revenue_items: [],
    revenue_currency:String,

    
    // order status
    order_status :{
        type:String,
        default:"added",
    },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    totalDistance : { 
        type: Number
    },
    createdAt: {
        type: Date,
        default: Date.now()   
    },
    
    deletedAt: {
        type: Date,
    },
},{
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
}); 


schema.virtual('gross_amount').get(function () {
    const items = this.revenue_items || [];
    let grossAmount = 0;
    items.forEach(item => {
        grossAmount += Number(item.value);
    });
    return grossAmount;
});


schema.virtual('profit').get(function () {
    const items = this.revenue_items || [];
    let grossAmount = 0;
    items.forEach(item => {
        grossAmount += Number(item.value);
    });
    const commission = grossAmount * (this.created_by.staff_commision /100);
    const actualProfit = grossAmount - commission - this.carrier_amount;
    return actualProfit;
});


 

module.exports = mongo.model('orders', schema);





// // Shipping details
const dummy_shipping_details = [
    {
       commudity:"Truck",
       equipment:"Laptop",
       weight: 3,
       weight_unit: "kg",
       pickup_location: "Jaipur Rajasthan Banipark, 302018",
       pickup_reference_no:'45845',
       pickup_date : "2025-03-12",
       pickup_is_appointment:1,
       delivery_location: "Partal, haryana near kanina, 123034",
       delivery_date: "2025-03-25",
       delivery_is_appointment: 0,
    },
    {
       commudity:"Truck",
       equipment:"Mobiles",
       weight: 45,
       weight_unit: "kg",
       pickup_location: "Jaipur Rajasthan Banipark, 302018 ",
       pickup_reference_no:'45822',
       pickup_date : "2025-03-12",
       pickup_is_appointment:1,
 
       // Delivery Location
       delivery_location: "Gurgaon area",
       delivery_date: "2025-03-22",
       delivery_is_appointment: 0,
    },
]

//  DUMMY REVNENUE ITEMS
const dummy_revenue_items =[
    {
       "revenue_item": "Fright Charge",
       "rate_method" : "flat",
       "rate" : "500",
       "value" : "5000"
    },
    {
       "revenue_item": "Fuel Charge",
       "rate_method" : "flat",
       "rate" : "100",
       "value" : "1000"
    }
 ]