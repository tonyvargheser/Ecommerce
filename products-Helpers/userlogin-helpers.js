var db= require('../config/connection')
var collection=require('../config/collection')
const bcrypt=require('bcrypt')
const { promise } = require('bcrypt/promises')
const { resolve, reject } = require('promise')
const async = require('hbs/lib/async')
const { response } = require('express')
const { ReturnDocument, ObjectId } = require('mongodb')
var obejectId = require('mongodb').ObjectId
const Razorpay = require('razorpay');
const { questionNewPassword } = require('readline-sync')
var instance = new Razorpay({
    key_id: 'rzp_test_0DDRyFcF7s6ygf',
    key_secret: 'u6y2PKNqKRbVHgwFjUxIw4PZ',
  });

module.exports={

    doSignup:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            userData.Password= await bcrypt.hash(userData.Password,10)
            console.log(userData)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
            resolve(data.insertedId)
            })

        })
        


    },
    doLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginStatus= false
            let response={}
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
            if(user){
                bcrypt.compare(userData.Password,user.Password).then((status)=>{
                    if(status){
                        console.log("login success");
                        response.user=user
                        response.status=true
                        resolve(response)
                    }else{
                        console.log("login Failed");
                        resolve({status:false})
                    }
                })
            }else{
                console.log("User Dosen't exisit");
                resolve({status:false})
            }
            
        })
    },
    addToCart:(proId,userId)=>{
        let proObj={
            item:obejectId(proId),
            quantity:1
        }
        return new Promise(async(resolve,reject)=>{
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:obejectId(userId)})
            if(userCart){
                let proExist=userCart.product.findIndex(product=>product.item==proId)
                console.log(proExist)
                if(proExist!=-1){
                    db.get().collection(collection.CART_COLLECTION).updateOne({user:obejectId(userId),'product.item':obejectId(proId)},{
                        $inc:{'product.$.quantity':1}
                    }).then(()=>{
                        resolve()
                    })
                }else{
                db.get().collection(collection.CART_COLLECTION).updateOne({user:obejectId(userId)},{
                    
                        $push:{product:proObj}                       
                    
                }                
                ).then((response)=>{
                   resolve()
                })
            }
            }else{
                let cartObj={
                    user:obejectId(userId),
                    product:[proObj]
                
                }
                console.log(cartObj)
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                   
                    resolve()
                })
            }
        })
    },
    getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{ user:obejectId(userId)}
                },
                {
                    $unwind:'$product'
                },
                {
                    $project:{
                        item:'$product.item',
                        quantity:'$product.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }


                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}

                    }
                }
                // {
                //     $lookup:{
                //         from :collection.PRODUCT_COLLECTION,
                //         let:{prodlist:'$product'},
                //         pipeline:[
                //             {
                //                 $match:{
                //                     $expr:{
                //                         $in:['$_id',"$$prodlist"]
                //                     }
                //                 }
                //             }
                //         ],
                //         as:'cartItems'
                //     }
                // }
            ]).toArray()
            //console.log(cartItems[0].product)
            resolve(cartItems)
        })
    },
    getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let count=0
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:obejectId(userId)})
            if(cart){
                count=cart.product.length

            }
            resolve(count)
        })
    },
    changeProductQuantity:(details)=>{
        details.count=parseInt(details.count)
        details.quantity=parseInt(details.quantity)
        return new Promise((resolve,reject)=>{
            if(details.count==-1 && details.quantity==1){
                db.get().collection(collection.CART_COLLECTION)
                .updateOne({_id:obejectId(details.cart)},
                {
                    $pull:{product:{item:obejectId(details.product)}}
                }).then((response)=>{
                    console.log(response)
                    resolve({removeProduct:true}) 
                })
            }else{
                db.get().collection(collection.CART_COLLECTION)   
                .updateOne({_id:obejectId(details.cart),'product.item':obejectId(details.product)},
                {
                    $inc:{'product.$.quantity':details.count}
                }).then((response)=>{   
                    resolve({status:true})                  
                })             
            }                                                  
        })

    },
    getTotalAmount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let total=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    
                    $match:{ user:obejectId(userId)}
                },
                {
                    $unwind:'$product'
                },
                {
                    $project:{
                        item:'$product.item',
                        quantity:'$product.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }


                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}

                    }
                },
                {
                    $group:{
                        
                        _id:null,
                        total:{$sum:{$multiply:['$quantity',{$toInt:'$product.Price'}]}}
                    }
                }
                
            ]).toArray()
            console.log(total)
            resolve(total[0].total)
        })

    },
    placeOrder:(order,product,totalPrice)=>{
        return new Promise((resolve,reject)=>{
            let status=order['payment-method']==='COD'?'placed':'pending'
            let orderObj={
                deliveryDetails:{
                    address:order.address,
                    pincode:order.pincode,
                    mobile:order.mobile
                },
                userId:obejectId(order.userId),
                paymentMethod:order['payment-method'],
                product:product,
                totalPrice:totalPrice,
                status:status,
                date:new Date()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(collection.CART_COLLECTION).deleteOne({user:obejectId(order.userId)})
                console.log("order id:",response.insertedId)
                resolve(response.insertedId)
            })
            
        })

    },
    getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:obejectId(userId)})
            console.log(cart)
            resolve(cart.product)

        })


    },
    getUserorders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            console.log(userId)
            let orders=await db.get().collection(collection.ORDER_COLLECTION).find({userId:obejectId(userId)}).toArray()
            console.log(orders)
            resolve(orders)
        })
    },
    getOrderProducts:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderItems=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{ _id:obejectId(orderId)}
                },
                {
                    $unwind:'$product'
                },
                {
                    $project:{
                        item:'$product.item',
                        quantity:'$product.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }


                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}

                    }
                }
                
            ]).toArray()
            console.log(orderItems)
            resolve(orderItems)
        })

    },
    generateRazorpay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
            var options = {
                amount: total*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt:""+orderId
              };
              instance.orders.create(options, function(err, order) {
                  if(err){
                      console.log(err)
                  }else{ 
                    console.log("New Order:",order);
                    resolve(order)

                  }
                
              });
            
        })

    },
    verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
            const crypto=require('crypto')
              
              let hmac = crypto.createHmac('sha256', 'u6y2PKNqKRbVHgwFjUxIw4PZ');
              hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
              hmac=hmac.digest('hex')
              if(hmac==details['payment[razorpay_signature]']){
                  resolve()
                  console.log(resolve)
              }else{
                  reject()
              }
        })

    },
    changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:obejectId(orderId)},
            {
                $set:{
                    status:'placed'
                }
            }
            ).then(()=>{
                resolve()
            })
        })
    },
    doAdminLogin:(userData)=>{
       // console.log(userData)
        return new Promise(async(resolve,reject)=>{
            let AdminloginStatus= false
            let response={}
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
            console.log(user)
            if(user.is_Admin==='1'){
                bcrypt.compare(userData.Password,user.Password).then((status)=>{
                    //console.log(status)
                    if(status){
                        console.log("login success");
                        response.user=user
                        response.status=true
                        resolve(response)
                    }else{
                        console.log("login Failed");
                        resolve({status:false})
                    }
                })
            }else{
                console.log("User Dosen't exisit");
                resolve({status:false})
            }
            
        })
    },
}




