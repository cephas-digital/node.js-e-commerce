var express = require('express');
var router = express.Router();
var async = require('async');

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('front/index', { title: 'NodeJS with MongoDB' });
});

/* GET login page. */
router.get('/login', function(req, res, next) {
	res.render('front/login', { title: 'Login' });
});

/* GET registration page. */
router.get('/register', function(req, res, next) {
	res.render('front/register', { title: 'Register' });
});

/* GET products page. */
router.get('/products', function(req, res, next) {
	
	var collection = req.db.get('products');
	collection.find({},{},function(e,docs){
		res.render('front/products', {
			'products' : docs,
			'title' : 'Products'
		});
	});
});

/* GET User Account page. */
router.get('/user/account', function(req, res, next) {
	res.render('user/account', { title: 'Account' });
});

/* GET User Products page. */
router.get('/user/products', function(req, res, next) {
	res.render('user/products', { title: 'My Products' });
});

/* GET User Products Add page. */
router.get('/user/products/add', function(req, res, next) {
	res.render('user/products-add', { title: 'Add Product' });
});

/* POST to Add User Service */
router.post('/user/products/create', function(req, res) {

    /* Set our internal DB variable */
    var db = req.db;
		products = db.get('products');
		
		/* Get our form values. These rely on the "name" attributes */
		product_name = req.body.name;
		product_content = req.body.content;
		product_excerpt = req.body.excerpt;
		product_price = req.body.price;
		product_status = req.body.status;
		product_quantity = req.body.quantity;
		product_date = req.body.date;
		
    /* Submit to the DB */
    products.insert({
        "name" : product_name,
        "content" : product_content,
        "excerpt" : product_excerpt,
        "price" : product_price,
        "status" : product_status,
        "quantity" : product_quantity,
        "date" : product_date
    }, function (err, doc) {
        if (err) {
            /* If it failed, return error */
            res.send("There was a problem adding the information to the database.");
        }
        else {
            /* And forward to success page */
            res.send(doc._id);
        }
    });
});

/* GET User Products Edit page. */
router.get('/user/products/edit/:id', function(req, res, next) {
	
	var db = req.db;
		item_id = req.params.id
		item_id_check = item_id.match(/^[0-9a-fA-F]{24}$/);
		products = db.get('products');
		item_details = '';
	
	/* Check if the object id is valid */
	if( item_id_check ){
		async.parallel([
			function(callback) {
				products.findOne(item_id).then((doc) => {
					item_details = doc;
					callback();
				});
			}	
		], function(err) {
			res.render('user/products-edit', { 
				title: 'Edit Product',
				item: item_details
			});
		});
		
	} else {
		res.status(404).send('Invalid Item ID');
	}
});

router.post('/user/products/update', function(req, res){
	/* Set our internal DB variable */
    var db = req.db;
		products = db.get('products');
	
	products.update(req.body.id, {
        'name' : req.body.name,
        'content' : req.body.content,
        'excerpt' : req.body.excerpt,
        'price' : req.body.price,
        'status' : req.body.status,
        'quantity' : req.body.quantity,
        'date' : req.body.date
    }, function (err, doc) {
        if(err) {
            /* If it failed, return error */
            res.send("There was a problem updating the information on the database.");
        } else {
            /* And forward to success page */
            res.send({'status' : 1});
        }
    });
	
});

router.post('/products/view-front', function(req, res){
	
	/* Set our internal DB variable */
    var db = req.db;
	
		/* Set our collection */
		products = db.get('products');
		
		pag_content = '';
		pag_navigation = '';
	
		page = parseInt(req.body.data.page); /* Page we are currently at */
		name = req.body.data.name; /* Name of the column name we want to sort */
		sort = req.body.data.sort; /* Order of our sort (DESC or ASC) */
		max = parseInt(req.body.data.max); /* Number of items to display per page */
		search = req.body.data.search; /* Keyword provided on our search box */
		
		cur_page = page;
		page -= 1;
		per_page = max ? max : 40; 
		previous_btn = true;
		next_btn = true;
		first_btn = true;
		last_btn = true;
		start = page * per_page;
	
		where_search = {};
	
	/* Check if there is a string inputted on the search box */
	if( search != '' ){
		/* If a string is inputted, include an additional query logic to our main query to filter the results */
		var filter = new RegExp(search, 'i');
		where_search = {
			'$or' : [
				{'name' : filter},
				{'price' : filter},
			]
		}
	}
	
	var all_items = '';
	var count = '';
	
	/* We use async task to make sure we only return data when all queries completed successfully */
	async.parallel([
		function(callback) {
			/* Retrieve all the posts */
			products.find( where_search, {
				limit: per_page,
				skip: start,
				sort: { name : sort == 'ASC' ? 1 : -1 }
				
			}, function(err, docs){
				if (err) throw err;
				// console.log(docs);
				all_items = docs;
				callback();
				
			});
		},
		function(callback) {
			products.count(where_search, function(err, doc_count){
				if (err) throw err;
				// console.log(count);
				count = doc_count;
				callback();
			});
		}
	], function(err) { //This is the final callback
		/* Check if our query returns anything. */
		if( count ){
			for (var key in all_items) {
				pag_content += '<div class="col-sm-3">' + 
					'<div class="panel panel-default">' + 
						'<div class="panel-heading">' + 
							all_items[key].name +
						'</div>' + 
						'<div class="panel-body p-0 p-b">' + 
							'<a href="products-single.php?item=' + all_items[key]._id + '"><img src="img/uploads/' + all_items[key].featured_image + '" width="100%" class="img-responsive" /></a>' + 
							'<div class="list-group m-0">' + 
								'<div class="list-group-item b-0 b-t">' + 
									'<i class="fa fa-calendar-o fa-2x pull-left ml-r"></i>' + 
									'<p class="list-group-item-text">Price</p>' + 
									'<h4 class="list-group-item-heading">$' + parseFloat(all_items[key].price).toFixed(2) + '</h4>' + 
								'</div>' + 
								'<div class="list-group-item b-0 b-t">' + 
									'<i class="fa fa-calendar fa-2x pull-left ml-r"></i>' + 
									'<p class="list-group-item-text">Quantity</p>' + 
									'<h4 class="list-group-item-heading">' + all_items[key].quantity + '</h4>' + 
								'</div>' + 
							'</div>' + 
						'</div>' + 
						'<div class="panel-footer">' + 
							'</p><a href="products-single.php?item=' + all_items[key]._id + '" class="btn btn-success btn-block">View Item</a></p>' + 
						 '</div>' + 
					'</div>' + 
				'</div>';
			}
		}
		
		pag_content = pag_content + "<br class = 'clear' />";
		
		no_of_paginations = Math.ceil(count / per_page);

		if (cur_page >= 7) {
			start_loop = cur_page - 3;
			if (no_of_paginations > cur_page + 3)
				end_loop = cur_page + 3;
			else if (cur_page <= no_of_paginations && cur_page > no_of_paginations - 6) {
				start_loop = no_of_paginations - 6;
				end_loop = $no_of_paginations;
			} else {
				end_loop = no_of_paginations;
			}
		} else {
			start_loop = 1;
			if (no_of_paginations > 7)
				end_loop = 7;
			else
				end_loop = no_of_paginations;
		}
		  
		pag_navigation += "<ul>";

		if (first_btn && cur_page > 1) {
			pag_navigation += "<li p='1' class='active'>First</li>";
		} else if (first_btn) {
			pag_navigation += "<li p='1' class='inactive'>First</li>";
		} 

		if (previous_btn && cur_page > 1) {
			pre = cur_page - 1;
			pag_navigation += "<li p='" + pre + "' class='active'>Previous</li>";
		} else if (previous_btn) {
			pag_navigation += "<li class='inactive'>Previous</li>";
		}
		for (i = start_loop; i <= end_loop; i++) {

			if (cur_page == i)
				pag_navigation += "<li p='" + i + "' class = 'selected' >" + i + "</li>";
			else
				pag_navigation += "<li p='" + i + "' class='active'>" + i + "</li>";
		}
		
		if (next_btn && cur_page < no_of_paginations) {
			nex = cur_page + 1;
			pag_navigation += "<li p='" + nex + "' class='active'>Next</li>";
		} else if (next_btn) {
			pag_navigation += "<li class='inactive'>Next</li>";
		}

		if (last_btn && cur_page < no_of_paginations) {
			pag_navigation += "<li p='" + no_of_paginations + "' class='active'>Last</li>";
		} else if (last_btn) {
			pag_navigation += "<li p='" + no_of_paginations + "' class='inactive'>Last</li>";
		}

		pag_navigation = pag_navigation + "</ul>";
		
		var response = {
			'content': pag_content,
			'navigation' : pag_navigation
		};
		
		res.send(response);
		
	});

});

/* GET User Products Edit page. */
router.get('/user/products/edit', function(req, res, next) {
  res.render('user/products-edit', { title: 'Edit Product' });
});

/* GET Userlist page. */
router.get('/userlist', function(req, res) {
    var db = req.db;
    var collection = db.get('usercollection');
    collection.find({},{},function(e,docs){
        res.render('userlist', {
            "userlist" : docs
        });
    });
});

/* GET New User page. */
router.get('/newuser', function(req, res) {
    res.render('newuser', { title: 'Add New User' });
});

/* POST to Add User Service */
router.post('/adduser', function(req, res) {

    /* Set our internal DB variable */
    var db = req.db;

    /* Get our form values. These rely on the "name" attributes */
    var userName = req.body.username;
    var userEmail = req.body.useremail;

    /* Set our collection */
    var collection = db.get('usercollection');

    /* Submit to the DB */
    collection.insert({
        "username" : userName,
        "email" : userEmail
    }, function (err, doc) {
        if (err) {
            /* If it failed, return error */
            res.send("There was a problem adding the information to the database.");
        }
        else {
            /* And forward to success page */
            res.redirect("userlist");
        }
    });
});

module.exports = router;
