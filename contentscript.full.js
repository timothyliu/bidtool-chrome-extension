//  Declare SQL Query for SQLite
var createStatement = [
	["CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, created DATETIME)"], 
	["CREATE TABLE IF NOT EXISTS bids (id INTEGER PRIMARY KEY AUTOINCREMENT, userid INTEGER NOT NULL, price INTEGER NOT NULL, bidtime DATETIME NOT NULL, auctid TEXT NOT NULL)"],
	["CREATE VIEW IF NOT EXISTS bidcount AS SELECT username, COUNT(b.id) as 'count', MAX(bidtime), MIN(bidtime), MAX(price), MIN(price), b.auctid from users u inner join bids b on b.userid=u.id GROUP BY u.id, b.auctid"]
];
var selectViewStatement = "SELECT * FROM bidcount";
var selectUserStatement = "SELECT * FROM users WHERE username=?";
var insertUserStatement = "INSERT INTO users (username, created) VALUES (?, ?)";
var selectBidsStatement = "SELECT * FROM bids WHERE userid=? and price=? and bidtime=? and auctid=?";
var insertBidsStatement = "INSERT INTO bids (userid, price, bidtime, auctid) VALUES (?, ?, ?, ?)";
//var deleteStatement = "DELETE FROM Contacts WHERE id=?";
var selectBidCountStatement = "SELECT * FROM bidcount WHERE auctid=? ORDER BY [MAX(price)] DESC LIMIT 0, 20";
var dropStatement = "DROP TABLE users; DROP TABLE bids;";
var db = openDatabase("AddressBook", "1.0", "Address Book", 200000);  // Open SQLite Database
var dataset;
var DataType;
var isLog=false;
function initDatabase()  // Function Call When Page is ready.
{
    try {
        if (!window.openDatabase)  // Check browser is supported SQLite or not.
        {
            alert('Databases are not supported in this browser.');
        }
        else {
            createTable();  // If supported then call Function for create table in SQLite
        }
    }
    catch (e) {
        if (e == 2) {
            // Version number mismatch. 
            console.log("Invalid database version.");
        } else {
            console.log("Unknown error " + e + ".");
        }
        return;
    }
}
function createTable()  // Function for Create Table in SQLite.
{
    db.transaction(function (tx) { 
    	for (i = 0; i < createStatement.length; i++) {
    		 tx.executeSql(createStatement[i], [], function(){
    		 	if(isLog) 
    		 		console.log('ok: ' + createStatement[i])
    		 }, onError);
    	}
    });
}
function onError(tx, error) // Function for Hendeling Error...
{
    alert(error.message);
}
function insertRecord(data)
{
	var userId;
	db.transaction(function (tx) {
        tx.executeSql(selectUserStatement, [data.username], 
	        function (tx, result) 
	        {
	            dataset = result.rows;
	            if(dataset.length==0){
	            	isExist = false;
	            	if(isLog) console.log(data.username + ' is not exist');
	            	addUser(data, tx, insertBid);
	            }else{
	    			userId = result.rows.item(0).id;
	    			if(isLog) console.log(data.username + ' id: ' + userId);
	    			insertBid(data, userId, tx);
	    		}
	    	}
	    , onError);
	});
}
function insertBid(data, userId, tx) {
	tx.executeSql(selectBidsStatement, [userId, data.price, data.time, data.auctid], function(tx, result){
		if(isLog) console.log(selectBidsStatement.replace(/\?/g, "'%s'"), userId, data.price, data.time, data.auctid);
		if(result.rows.length>0){
			if(isLog) console.log('bids exist: ' + data.price + ', ' + userId + '(' + data.username + '), ' + data.time + ', auctid: ' + data.auctid);
		}else{
			tx.executeSql(insertBidsStatement, [userId, data.price, data.time, data.auctid], function(tx, result){
				if(isLog) console.log('insert bids(' + result.insertId + '): ' + data.price + ', ' + userId + '(' + data.username + '), ' + data.time);
				updatePanel();
			}, onError);
		}
	}, onError);
}
function addUser(data, tx, callback){
	tx.executeSql(insertUserStatement, [data.username, new Date()], function(tx, result){
		if(isLog) console.log('new user: ' + data.username + ', id: ' + result.insertId);
		callback(data, result.insertId, tx);
	}, onError);
}
function saveHistory(saveAll){
	var rowno = 1;
	if (saveAll) rowno = eval(sitesConf[siteno].historylength);
	var hstry = {};
	var price;
	for (i = 0; i < rowno; i++) {
		if(isLog) console.log(i + ":" + sitesConf[siteno].price.replace("[?row]", i));
		price = eval(sitesConf[siteno].price.replace("[?row]", i));
		if(price && !isNaN(price)){
			hstry = {
				price: price,
				username: eval(sitesConf[siteno].username.replace("[?row]", i)),
				time: eval(sitesConf[siteno].time.replace("[?row]", i)),
				auctid: eval(sitesConf[siteno].auctid)
			}
			insertRecord(hstry);
			if(isLog) console.log(price + ', ' + hstry.username + ', ' + hstry.time);
		}
	}
}

function updatePanel(){
	var auctid = eval(sitesConf[siteno].auctid);
	db.transaction(function (tx) {
		tx.executeSql(selectBidCountStatement, [auctid], function(tx, result){
			if(isLog) console.log(selectBidCountStatement.replace(/\?/g, "'%s'"), auctid);
			if(result.rows.length>0){
				dataset = result.rows;
				var opt = "<table><tr><td colspan=4>" + dateFormat(new Date(), "yyyy, mmm, dd, HH:MM:ss") + "<tr><td>bider<td>count<td>bidtime<td>price";
	            for (var i = 0, item = null; i < dataset.length; i++) {
	                item = dataset.item(i);
	                opt += '<tr><td>' + item['username'] + '<td>' + item['count'] + '<td>' + item['MIN(bidtime)'] + '~' + item['MAX(bidtime)'] +
	                	'<td>' + item['MIN(price)'] + '~' + item['MAX(price)'] + '</tr>';
	                $("#bidtool").append(opt);
	            }
	            $("#bidtool").html(opt);
			}
		}, onError);
	});
}

function getUrlVar(key){
    var result = new RegExp(key + "=([^&]*)", "i").exec(window.location.search); 
    return result && unescape(result[1]) || ""; 
}



var sitesConf = {};
sitesConf[0]={	
	host: "www.justbidit.com.tw",
	close_condition: '$("div.data.tips.counter.countdown").html().trim()=="已結標"',
	price: '$("#bidHistory tr:eq([?row]) td:eq(1)").html()',
	username: '$("#bidHistory tr:eq([?row]) td:eq(2)").html().split("&nbsp;")[3]',
	time: '$("#bidHistory tr:eq([?row]) td:eq(2)").html().split("&nbsp;")[1]',
	auctid: 'getUrlVar("nid")',
	historylength: '$("#bidHistory tr").length',
	delaytime: 'window.initTimestamp = Math.round(new Date().getTime() / 1000)-300'
};
sitesConf[1]={	
	host: "www.bidandbuy.com.tw",
	close_condition: '$("p.rf-final-result").html()!=null',
	price: '$("#bid-history-table.bid-history tr:eq([?row]) td:eq(0)").html()',
	username: '$("#bid-history-table.bid-history tr:eq([?row]) td:eq(1) div").html()',
	time: '$("#bid-history-table.bid-history tr:eq([?row]) td:eq(2)").html()',
	auctid: '$("#bid-history-table.bid-history").attr("bnb:auction")',
	historylength: '$("#bid-history-table.bid-history tr").length'
};
sitesConf[2]={	
	host: "auction.agito.com.tw",
	close_condition: '$("div.timer")[4].innerHTML=="已結束"',
	price: '$("#recent_bids_" + $("#auction_id").html() + " tr:eq([?row]) td.price").html().replace("元", "")',
	username: '$("#recent_bids_" + $("#auction_id").html() + " tr:eq([?row]) td.bidder").html()',
	time: '$("#recent_bids_" + $("#auction_id").html() + " tr:eq([?row]) td.time").html()',
	auctid: '$("#auction_id").html()',
	historylength: '$("#recent_bids_" + $("#auction_id").html() + " tr").length'
};
var siteno = 0;
for (i = 0; i < 10; i++) {
	if (sitesConf[i] && sitesConf[i].host==location.host) {
		siteno = i;
	}
}
var timerID2;
var lasttime='', recentime;
clearInterval(timerID2);

window.alert = function() {
    console.log.apply(console, arguments);
};
$(document).ready(function () // Call function when page is ready for load..
{
    initDatabase();
    timerID2 = setInterval(function (){
    	if(sitesConf[siteno].delaytime)eval(sitesConf[siteno].delaytime);
    	if(eval(sitesConf[siteno].close_condition)){
    		clearInterval(timerID2);
    		console.log("bid closed!");
    		return;
    	}
    	saveHistory(true);
    	
    }, 1000);
    
	$("body").append('<style>#bidtool td {	padding:4px;text-align: center;border-right: 1px solid #C1DAD7;border-bottom: 1px solid #C1DAD7;}</style><div id="bidtool" style="background-color: #666633; width: 300px; height: 800px;padding:2px;color:white;">');
	$("#bidtool").floatdiv({top:"10px", right:"10px"});

	if(!eval(sitesConf[siteno].close_condition)){
	    saveHistory(true);
	}
	updatePanel();
	
	//特例：
	if(siteno==0)
		selectBidCountStatement = "SELECT * FROM bidcount WHERE auctid=? ORDER BY [MIN(price)] LIMIT 0, 20";
});

