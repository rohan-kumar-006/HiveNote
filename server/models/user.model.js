import mongoose ,{Schema,model} from "mongoose";
import bcrypt from 'bcrypt'

const userSchema=new Schema({
    name:{type:String, required:true},
    email:{type:String,required:true, trim:true, lowercase:true},
    password:{type:String}, // hased password ko rakhna hai
    avatarUrl:{type:String},
    // provider:{type:String, enum:['local','google','github'], default:'local'},
},{timestamps:true})

// helper to set password
// userSchema.methods.setPassword = async function (plain) {
//   this.passwordHash = await bcrypt.hash(plain, 12)
// }

// // verify
// userSchema.methods.verifyPassword = async function (plain) {
//   return bcrypt.compare(plain, this.passwordHash)
// }

export default model("User",userSchema)
