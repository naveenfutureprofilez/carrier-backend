const mongo = require('mongoose'); 
const slugify = require('slugify'); 
const schema = new mongo.Schema({
    company_name:{ 
        type:String,
        require:true,
    },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    order_no:  {
        type:String,
        unique:true,
    },

    // Shipping details
    commudity:String,
    equipment:String,
    weight:{type:Number},
    weight_unit:{type:String},

    // Pickup Location
    pickup_location: String,
    reference_no:String,
    pickup_date:{
        type: Date,
    },
    is_appointment: {
        type:String
    },
    revenue_items: [],
    createdAt: {
        type: Date,
        default: Date.now()     
    },
}); 

// Will runs ony when .save or .create trigger not for insertMany
schema.pre('save',function(next){
    this.slugtest= slugify(this.name, {lower:true})
    next();
});

// To Not Find All Document Matching this Condition
// schema.pre(/^find/,function(next){
//     this.find({year : {$ne:'2023'}})
//     next();
// });


module.exports = mongo.model('orders', schema);