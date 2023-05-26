const { Router } = require('express');
var express = require('express');
const req = require('express/lib/request');
const async = require('hbs/lib/async');
const { response } = require('../app');
var router = express.Router();
const productsHelper=require('../products-Helpers/products-Manage')
const userloginHelpers=require('../products-Helpers/userlogin-helpers')
const bcrypt=require('bcrypt')
const { promise } = require('bcrypt/promises')
const { resolve, reject } = require('promise')
const { ReturnDocument, ObjectId } = require('mongodb')
var obejectId = require('mongodb').ObjectId
// var $  = require('jquery');
// var dt = require('datatables.net')();


const AdminveryfyLogin=(req,res,next)=>{
  // console.log(req.session.admin)
  if(req.session.adminloggedIn){
     //let admin:true
    // req.session.admin.loggedIn=true
    // req.session.admin.is_verified=1
    next()

  }else{
    res.render('admin/admin-Login',{admin:true})
  }
}

/* GET users listing. */
router.get('/',function(req, res, next) {
  let user=req.session.admin
  console.log(user)
if(req.session.admin){
    productsHelper.getAllProduct().then((products)=>{
     
      res.render('admin/view-products',{admin:true,products,user})
    })

   }else{
     res.render('admin/admin-page',{admin:true})
     
  }
  
})
router.get('/admin-login',(req,res)=>{
  //res.render('admin/admin-login',{admin:true})
    if(req.session.admin){
          res.render('/admin',{admin:true})
   }else{
     res.render('admin/admin-login',{"loginErr":req.session.adminloginErr,admin:true}) 
     req.session.adminloginErr=false 
    }  
 }) 
router.post('/admin-login',(req,res)=>{
  userloginHelpers.doAdminLogin(req.body).then((response)=>{
   
    if(response.status){
      req.session.admin=response.user
      req.session.admin.loggedIn=true
      res.redirect('/admin')
    }else{
      req.session.adminloginErr="You are not a admin"
      res.redirect('/admin-login')
    }
  })
})
router.get('/admin-page',(req, res)=>{
  res.render('admin/admin-page',{admin:true})
}) 
router.get('/admin-logout',(req,res)=>{
  req.session.admin=null
  req.session.adminloggedIn=false
  //req.session.destroy()
  res.redirect('/',{adamin:true})
  
})

router.get('/add-products',function(req,res){
  res.render('admin/add-products')
})
router.post('/add-products',(req,res)=>{
  console.log(req.body);
  console.log(req.files.image);
  productsHelper.addProducts(req.body,(id)=>{
    let image=req.files.image
    console.log(id)
    image.mv('./public/products-images/'+id+'.jpg',(err,done)=>{
      if(!err){
        res.render("admin/add-products")

      }else{
        console.log(err);
      }
      
    })
    
  })
  
})
router.get('/delete-product/:id',(req,res)=>{
  let proId=req.params.id
  productsHelper.deleteProduct(proId).then((response)=>{
    res.redirect('/admin')
  })

})
router.get('/edit-product/:id',async(req,res)=>{
  let product=await productsHelper.getProductDetails(req.params.id)
  console.log(product)
  res.render('admin/edit-product',{product})

})
router.post('/edit-product/:id',(req,res)=>{
  let id=req.params.id

  productsHelper.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.image){
      let image=req.files.image
      image.mv('./public/products-images/'+id+'.jpg')   
    }
  })
})

module.exports = router;
