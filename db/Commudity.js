const mongoose = require('mongoose');
const schema = new mongoose.Schema({
   tenantId: { 
      type: String, 
      required: true, 
      index: true,
      default: 'legacy_tenant_001' // Default for existing data migration
   },
   company: { type: mongoose.Schema.Types.ObjectId, ref: 'companies' },
   name: { 
      type:String,
      required:[true, 'Commodity name can not be empty.']
    },   
    createdAt: {
      type: Date,
      default: Date.now()     
   },
});
const Commudity = mongoose.model('commudity', schema);
module.exports = Commudity;

 