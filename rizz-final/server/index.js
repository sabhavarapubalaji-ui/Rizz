require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'arjunchandu2311@gmail.com').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
const db = new Database(path.join(__dirname, 'rizz.sqlite'));
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
 phone TEXT, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS products (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL,
 price INTEGER NOT NULL, image TEXT NOT NULL, sizes TEXT NOT NULL, colors TEXT NOT NULL,
 stock INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, customer_name TEXT NOT NULL, customer_email TEXT NOT NULL,
 customer_phone TEXT NOT NULL, address TEXT NOT NULL, payment_method TEXT NOT NULL, payment_status TEXT NOT NULL,
 order_status TEXT NOT NULL DEFAULT 'Pending', total INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS order_items (
 id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, product_id INTEGER NOT NULL, product_name TEXT NOT NULL,
 variant TEXT NOT NULL, quantity INTEGER NOT NULL, unit_price INTEGER NOT NULL, subtotal INTEGER NOT NULL,
 FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
`);

const demoProducts = [
 ['Regal Noir Shirt','shirts','A tailored black shirt with a refined silhouette for evening and occasion wear.',2499,'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=85','S,M,L,XL','Black',12],
 ['Ivory Crest Shirt','shirts','Clean ivory cotton with understated detailing and a polished royal feel.',2299,'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85','S,M,L,XL','Ivory',9],
 ['Crownline Trousers','pants','Straight-fit trousers designed to pair with elevated everyday looks.',2799,'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=900&q=85','30,32,34,36','Charcoal',8],
 ['Midnight Tailored Pants','pants','Sharp formal trousers with a smooth drape and premium finish.',2999,'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=85','30,32,34,36','Black',6],
 ['Rizz Signature Tee','t-shirts','Minimal heavyweight tee carrying the Rizz attitude without the noise.',1599,'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85','S,M,L,XL','Cream',15],
 ['Goldline Essential Tee','t-shirts','Soft premium tee with a subtle champagne-inspired accent.',1699,'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=85','S,M,L,XL','Black',11],
 ['Noir Evening Dress','dresses','An elegant black dress designed around clean lines and graceful movement.',4499,'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=900&q=85','XS,S,M,L','Black',5],
 ['Champagne Muse Dress','dresses','A refined occasion dress with a soft silhouette and luminous neutral tone.',4799,'https://images.unsplash.com/photo-1566174053879-31528523f8ae?auto=format&fit=crop&w=900&q=85','XS,S,M,L','Champagne',4]
];
if (db.prepare('SELECT COUNT(*) c FROM products').get().c === 0) {
 const ins = db.prepare('INSERT INTO products(name,category,description,price,image,sizes,colors,stock,active) VALUES (?,?,?,?,?,?,?,?,1)');
 const tx = db.transaction(() => demoProducts.forEach(p => ins.run(...p)));
 tx();
}
if (!db.prepare('SELECT id FROM users WHERE email=?').get(ADMIN_EMAIL)) {
 const hash = bcrypt.hashSync(ADMIN_PASSWORD, 12);
 db.prepare('INSERT INTO users(name,email,phone,password_hash,role) VALUES (?,?,?,?,?)').run('Rizz Owner', ADMIN_EMAIL, '', hash, 'admin');
}

app.use(express.json({limit:'1mb'}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname,'..','public')));

function sign(user){ return jwt.sign({id:user.id,email:user.email,role:user.role,name:user.name}, JWT_SECRET, {expiresIn:'7d'}); }
function auth(req,res,next){
 try {
  const token = req.cookies.rizz_token || (req.headers.authorization||'').replace('Bearer ','');
  if(!token) return res.status(401).json({error:'Authentication required'});
  req.user = jwt.verify(token, JWT_SECRET); next();
 } catch { return res.status(401).json({error:'Invalid or expired session'}); }
}
function admin(req,res,next){ auth(req,res,()=> req.user.role==='admin' ? next() : res.status(403).json({error:'Admin access required'})); }
function safeProduct(p){ return {...p, sizes:p.sizes.split(',').filter(Boolean), colors:p.colors.split(',').filter(Boolean), active:Boolean(p.active)}; }
function orderDetails(id){
 const o=db.prepare('SELECT * FROM orders WHERE id=?').get(id); if(!o) return null;
 const items=db.prepare('SELECT * FROM order_items WHERE order_id=?').all(id); return {...o,items};
}
async function sendOrderEmail(order){
 const text = `RIZZ ORDER #${order.id}\nDate: ${order.created_at}\nCustomer: ${order.customer_name}\nEmail: ${order.customer_email}\nPhone: ${order.customer_phone}\nAddress: ${order.address}\nPayment: ${order.payment_method} (${order.payment_status})\nStatus: ${order.order_status}\n\n${order.items.map(i=>`${i.product_name} | ${i.variant} | Qty ${i.quantity} | ₹${i.unit_price} | ₹${i.subtotal}`).join('\n')}\n\nTOTAL: ₹${order.total}`;
 if(!process.env.SMTP_HOST){ console.log('\n--- RIZZ ORDER EMAIL (SMTP not configured) ---\n'+text+'\n--- END ---\n'); return; }
 const transporter=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:Number(process.env.SMTP_PORT||587)===465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
 await transporter.sendMail({from:process.env.SMTP_FROM,to:ADMIN_EMAIL,subject:`Rizz Order #${order.id} — ₹${order.total}`,text});
 await transporter.sendMail({from:process.env.SMTP_FROM,to:order.customer_email,subject:`Rizz Order Confirmation #${order.id}`,text});
}

app.get('/api/config',(req,res)=>res.json({currency:process.env.STORE_CURRENCY||'INR', razorpayEnabled:Boolean(process.env.RAZORPAY_KEY_ID)}));
app.get('/api/products',(req,res)=>{
 let {category='',search='',sort='featured'}=req.query;
 let sql='SELECT * FROM products WHERE active=1'; const args=[];
 if(category){sql+=' AND category=?';args.push(category)}
 if(search){sql+=' AND (name LIKE ? OR description LIKE ?)';args.push('%'+search+'%','%'+search+'%')}
 if(sort==='price-asc')sql+=' ORDER BY price ASC'; else if(sort==='price-desc')sql+=' ORDER BY price DESC'; else sql+=' ORDER BY id DESC';
 res.json(db.prepare(sql).all(...args).map(safeProduct));
});
app.get('/api/products/:id',(req,res)=>{const p=db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(req.params.id); if(!p)return res.status(404).json({error:'Product not found'});res.json(safeProduct(p));});

app.post('/api/auth/register',(req,res)=>{
 const {name,email,phone,password}=req.body||{};
 if(!name||!email||!password||password.length<6)return res.status(400).json({error:'Name, email and a password of at least 6 characters are required'});
 const e=String(email).trim().toLowerCase(); if(!/^\S+@\S+\.\S+$/.test(e))return res.status(400).json({error:'Enter a valid email'});
 try{const hash=bcrypt.hashSync(password,12);const r=db.prepare('INSERT INTO users(name,email,phone,password_hash) VALUES(?,?,?,?)').run(name.trim(),e,phone||'',hash);const u=db.prepare('SELECT id,name,email,phone,role FROM users WHERE id=?').get(r.lastInsertRowid);res.cookie('rizz_token',sign(u),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:7*86400000});res.json({user:u});}catch(e){res.status(409).json({error:'Email is already registered'});}
});
app.post('/api/auth/login',(req,res)=>{const {email,password}=req.body||{};const u=db.prepare('SELECT * FROM users WHERE email=?').get(String(email||'').trim().toLowerCase());if(!u||!bcrypt.compareSync(password||'',u.password_hash))return res.status(401).json({error:'Invalid email or password'});res.cookie('rizz_token',sign(u),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:7*86400000});res.json({user:{id:u.id,name:u.name,email:u.email,phone:u.phone,role:u.role}})});
app.post('/api/auth/logout',(req,res)=>{res.clearCookie('rizz_token');res.json({ok:true})});
app.get('/api/auth/me',auth,(req,res)=>{const u=db.prepare('SELECT id,name,email,phone,role FROM users WHERE id=?').get(req.user.id);res.json({user:u})});

app.post('/api/orders',auth,(req,res)=>{
 const {items,customer,address,paymentMethod}=req.body||{};
 if(!Array.isArray(items)||!items.length)return res.status(400).json({error:'Your cart is empty'});
 if(!customer?.name||!customer?.email||!customer?.phone||!address?.line1||!address?.city||!address?.state||!address?.postalCode||!address?.country)return res.status(400).json({error:'Complete delivery details are required'});
 if(!['cod','upi','debit-card','credit-card'].includes(paymentMethod))return res.status(400).json({error:'Invalid payment method'});
 const getP=db.prepare('SELECT * FROM products WHERE id=? AND active=1'); const clean=[]; let total=0;
 for(const it of items){const p=getP.get(it.productId);const qty=Number(it.quantity);if(!p||!Number.isInteger(qty)||qty<1)return res.status(400).json({error:'Invalid cart item'});if(qty>p.stock)return res.status(409).json({error:`Only ${p.stock} left for ${p.name}`});const variant=String(it.variant||'').trim();if(!variant)return res.status(400).json({error:`Choose a size/variant for ${p.name}`});const subtotal=p.price*qty;total+=subtotal;clean.push({p,qty,variant,subtotal});}
 if(paymentMethod!=='cod' && !process.env.RAZORPAY_KEY_ID)return res.status(503).json({error:'Online payment is not configured yet. Use Cash on Delivery or configure Razorpay in .env.'});
 const addressText=`${address.line1}, ${address.city}, ${address.state} ${address.postalCode}, ${address.country}`;
 const paymentStatus=paymentMethod==='cod'?'Pending':'Awaiting online payment';
 const tx=db.transaction(()=>{
  const o=db.prepare('INSERT INTO orders(user_id,customer_name,customer_email,customer_phone,address,payment_method,payment_status,total) VALUES(?,?,?,?,?,?,?,?)').run(req.user.id,customer.name,customer.email,customer.phone,addressText,paymentMethod,paymentStatus,total);
  for(const x of clean){db.prepare('INSERT INTO order_items(order_id,product_id,product_name,variant,quantity,unit_price,subtotal) VALUES(?,?,?,?,?,?,?)').run(o.lastInsertRowid,x.p.id,x.p.name,x.variant,x.qty,x.p.price,x.subtotal);db.prepare('UPDATE products SET stock=stock-? WHERE id=? AND stock>=?').run(x.qty,x.p.id,x.qty);}
  return o.lastInsertRowid;
 });
 const order=orderDetails(tx); sendOrderEmail(order).catch(err=>console.error('Email error:',err.message));
 res.status(201).json({order});
});
app.get('/api/orders',auth,(req,res)=>{const rows=req.user.role==='admin'?db.prepare('SELECT * FROM orders ORDER BY id DESC').all():db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC').all(req.user.id);res.json(rows.map(o=>({...o,items:db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id)})))});

app.get('/api/admin/products',admin,(req,res)=>res.json(db.prepare('SELECT * FROM products ORDER BY id DESC').all().map(safeProduct)));
app.post('/api/admin/products',admin,(req,res)=>{const p=req.body||{};if(!p.name||!p.category||!p.description||!Number.isFinite(Number(p.price)))return res.status(400).json({error:'Name, category, description and price are required'});const r=db.prepare('INSERT INTO products(name,category,description,price,image,sizes,colors,stock,active) VALUES(?,?,?,?,?,?,?,?,?)').run(p.name,p.category,p.description,Math.round(Number(p.price)),p.image||'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85',(p.sizes||['M']).join(','),(p.colors||['Black']).join(','),Math.max(0,Number(p.stock||0)),p.active===false?0:1);res.status(201).json(safeProduct(db.prepare('SELECT * FROM products WHERE id=?').get(r.lastInsertRowid)))});
app.put('/api/admin/products/:id',admin,(req,res)=>{const p=req.body||{};db.prepare('UPDATE products SET name=?,category=?,description=?,price=?,image=?,sizes=?,colors=?,stock=?,active=? WHERE id=?').run(p.name,p.category,p.description,Math.round(Number(p.price)),p.image||'',Array.isArray(p.sizes)?p.sizes.join(','):p.sizes||'',Array.isArray(p.colors)?p.colors.join(','):p.colors||'',Math.max(0,Number(p.stock||0)),p.active?1:0,req.params.id);const out=db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);if(!out)return res.status(404).json({error:'Product not found'});res.json(safeProduct(out))});
app.patch('/api/admin/orders/:id',admin,(req,res)=>{const allowed=['Pending','Confirmed','Packed','Shipped','Delivered','Cancelled'];if(!allowed.includes(req.body.status))return res.status(400).json({error:'Invalid order status'});const r=db.prepare('UPDATE orders SET order_status=? WHERE id=?').run(req.body.status,req.params.id);if(!r.changes)return res.status(404).json({error:'Order not found'});res.json(orderDetails(req.params.id))});

app.get('/api/health',(req,res)=>res.json({ok:true,service:'Rizz',time:new Date().toISOString()}));
app.use((req,res)=>res.sendFile(path.join(__dirname,'..','public','index.html')));
app.listen(PORT,()=>console.log(`Rizz running at http://localhost:${PORT}`));
