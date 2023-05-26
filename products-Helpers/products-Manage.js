const { resolve, reject } = require('promise')
var db= require('../config/connection')
var collection=require('../config/collection')
const async = require('hbs/lib/async')
const { response } = require('../app')
var obejectId = require('mongodb').ObjectId


module.exports={


    addProducts:(products,callback)=>{
        console.log(products)
        db.get().collection('product').insertOne(products).then((data)=>{
            console.log(data)
            callback(data.insertedId)
        })


    },
    getAllProduct:()=>{
        return new Promise(async(resolve,reject)=>{
            let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            console.log(products)
            resolve(products)
        })

    },
    deleteProduct:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:obejectId(proId)}).then((response)=>{
                resolve(response)
            })
        })
    },
    getProductDetails:(proId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:obejectId(proId)}).then((prodcut)=>{
                resolve(prodcut)
            })
        })
    },
    updateProduct:(proId,proDetails)=>{
        return new Promise((resolve,reject)=>{

            db.get().collection(collection.PRODUCT_COLLECTION)
            .updateOne({_id:obejectId(proId)},{
                 $set:{
                    Name:proDetails.Name,
                    Category:proDetails.Category,
                    Price:proDetails.Price,
                    Description:proDetails.Description
                }

            }).then((response)=>{
                resolve(response)
            })
    
        })
    },


}