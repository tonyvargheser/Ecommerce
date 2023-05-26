const { use } = require('bcrypt/promises');
var express = require('express');
const session = require('express-session');
const res = require('express/lib/response');
const async = require('hbs/lib/async');
const { response } = require('../app');
var router = express.Router();
const productsHelper=require('../products-Helpers/products-Manage')
const userloginHelpers=require('../products-Helpers/userlogin-helpers')
const veryfyLogin=(req,res,next)=>{
  if(req.session.userloggedIn){
    next()

  }else{
    res.redirect('/login')
  }
}
/* GET home page. */
router.get('/', async function(req, res, next) {
  let user=req.session.user
  console.log(user)
  let cartCount=null
  if(req.session.user){
  cartCount=await userloginHelpers.getCartCount(req.session.user._id)
  }
  productsHelper.getAllProduct().then((products)=>{
    //console.log(products)
    res.render('user/view-products',{products,user,cartCount})
  })
//   
});
router.get('/login',(req, res)=>{
  if(req.session.user){
    res.redirect('/')
  }else{
    res.render('user/login',{"loginErr":req.session.userloginErr}) 
    req.session.userloginErr=false 
   }  
}) 
router.get('/signup',(req, res)=>{
  res.render('user/signup')
}) 
router.post('/signup',(req,res)=>{
  userloginHelpers.doSignup(req.body).then((response)=>{
     console.log(response)
     
     req.session.user=response
     req.session.user.loggedIn=true
     res.redirect('/')
  })
})
router.post('/login',(req,res)=>{
  userloginHelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.user=response.user
      req.session.user.loggedIn=true
      res.redirect('/')
    }else{
      req.session.userloginErr="Invalid username or Password"
      res.redirect('/login')
    }
  })
})
router.get('/logout',(req,res)=>{
  req.session.user=null
  req.session.userloggedIn=false
  res.redirect('/')
  
})
router.get('/cart',veryfyLogin,async(req,res)=>{
  let product=await userloginHelpers.getCartProducts(req.session.user._id)
  let totalValue=0
  if(product.length>0){
    totalValue=await userloginHelpers.getTotalAmount(req.session.user._id)
  } 
  console.log(product)
  console.log(totalValue)
  res.render('user/cart',{product,user:req.session.user,totalValue})
})
router.get('/add-to-cart/:id',(req,res)=>{
  console.log('api call')
  
  userloginHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
  
    res.json({status:true})
  })

})
router.post('/change-product-quantity',(req,res,next)=>{
  userloginHelpers.changeProductQuantity(req.body).then(async(response)=>{
    response.total=await userloginHelpers.getTotalAmount(req.body.user)
    res.json(response)

  })

})
router.get('/place-order',veryfyLogin, async(req,res)=>{
  let total=await userloginHelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order',{total,user:req.session.user})
})
router.post('/place-order',async(req,res)=>{
  let product=await userloginHelpers.getCartProductList(req.body.userId)
  let totalPrice=await userloginHelpers.getTotalAmount(req.body.userId)
  userloginHelpers.placeOrder(req.body,product,totalPrice).then((orderId)=>{
    console.log(orderId)
    if(req.body['payment-method']==='COD'){
      res.json({codSuccess:true})
    }else{
      userloginHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
        res.json(response)

      })

    }
    

  })
  console.log(req.body)
})
router.get('/order-confirm',(req,res)=>{
  res.render('user/order-confirm',{user:req.session.user})
})
router.get('/orders',async(req,res)=>{
  let orders=await userloginHelpers.getUserorders(req.session.user._id)
  res.render('user/orders',{user:req.session.user,orders})

})
router.get('/view-order-products/:id',async(req,res)=>{
  let product=await userloginHelpers.getOrderProducts(req.params.id)
  res.render('user/view-order-products',{user:req.session.user,product})
})
router.post('/verify-payment',(req,res)=>{
  console.log(req.body)
  userloginHelpers.verifyPayment(req.body).then(()=>{
    userloginHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      console.log('payment successfully')
      res.json({status:true})
    })
  }).catch((err)=>{
    console.log(err)
    res.json({status:false,errMsg:''})
  })

})
module.exports = router;
