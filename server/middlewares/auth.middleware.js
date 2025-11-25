import jwt from 'jsonwebtoken'

export const authMiddleware=async (req,res,next)=>{
    try{
        const token=req.headers.authorization?.split(' ')[1]

        if(!token){
            return res.status(401).json({error:"NO Token Available"})
        }
        const decoded=jwt.verify(token,process.env.JWT_SECRET)
        req.userId=decoded.userId
        next()
    }
    catch(err){
        res.status(500).json({error:"Invalid Token"})
    }
}