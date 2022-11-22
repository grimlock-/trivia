var conn;
var users = {};
var user_list = [];
var me;
var answering = null;
var port = location.port ? ":" + location.port : "";
var protocol = location.protocol == "https:" ? "wss:" : "ws:";



/*
 * Function-y functions
 */
function get_query_parameters()
{
	let ret = {};
	let str = location.search.substring(1);
	let params = str.split('&');
	for(let param of params)
	{
		let parts = param.split('=');
		let val = parts[1];
		switch(parts[0])
		{
			
			case "testing":
				ret.testing = true;
			break;

			case "users":
				ret.fake_users = Number(val);
			break;

			default:
				ret[parts[0]] = val;
			break;
		}
	}
	return ret;
}
function count_char(string, target)
{
	let count = 0;
	for(let character of string)
	{
		if(character == target)
			++count;
	}
	return count;
}
/*
 * User functions
 */
function User(values)
{
	this.elements = [];
	this.id = values.id;
	this._name = values.name || "user";
	this._admin = values.isAdmin || false;
	this._image = values.image || "default";
	this._score = values.score || 0;
	Object.defineProperty(this, "name", {
		get() { return this._name },
		set(val) {
			this._name = val;
			for(let e of this.elements)
				e.querySelector(".username").innerHTML = val;
		}
	});
	Object.defineProperty(this, "isAdmin", {
		get() { return this._admin; },
		set(val) {
			this._admin = val;
			for(let e of this.elements)
			{
				if(val)
					e.classList.add("admin");
				else
					e.classList.remove("admin");
			}
		}
	});
	Object.defineProperty(this, "score", {
		get() { return this._score; },
		set(val) {
			this._score = val;
		}
	});
}
function get_user(id)
{
	return users[id] || null;
}
function get_admin()
{
	for(let u of user_list)
	{
		if(u.isAdmin)
			return u;
	}
	return null;
}
function add_user(u, _self)
{
	users[u.id] = u;
	user_list.push(u);
	var d = document.createElement("div");
	d.classList.add("user");
	if (_self)
		d.classList.add("self");
	if(u.isAdmin)
		d.classList.add("admin");
	d.dataset.id = u.id;
	let sz = "110";
	if(typeof i_am_admin != "undefined")
		sz = "60";
	if(!u.image || u.image == "default")
		d.innerHTML = "<img class='usericon' src='white.jpg' width='" + sz + "' height='" + sz + "' /><div class='username'>" + u.name + "</div>";
	else
		d.innerHTML = "<img class='usericon' src='" + u.image + "' width='" + sz + "' height='" + sz + "' />" + "<div class='username'>" + u.name + "</div>";
	if (_self) {
		d.querySelector(".username").addEventListener("click", function(e){
			let n = prompt("Enter your new name");
			if(n)
			{
				n = n.trim();
				if(n) ws_namechange(n);
			}
		});
	}
	document.getElementById("userlist").appendChild(d);
	u.elements.push(d);
}
function remove_user(id)
{
	for(let i = 0; i < user_list.length; ++i)
	{
		if(user_list[i].id == id)
			user_list.splice(i, 1);
	}
	let u = users[id];
	for (let ele of u.elements) {
		ele.parentNode.removeChild(ele);
	}
	if(answering == id)
		release_lock();
	delete users[id];
}
/*
END user functions
*/


function ws_message(e)
{
	//var messages = JSON.parse(e.data);
	//if(!Array.isArray(messages))
	var msg = JSON.parse(e.data);
	if(!msg.blah)
		return;

	/*for(let msg of messages)
	{*/
		let u;
		if(msg.id)
			u = (msg.id == me.id ? me : get_user(msg.id));
		switch(msg.blah)
		{
			case "init":
				me = new User(msg.you);
				if(typeof i_am_admin != "undefined")
					msg_admin_init(msg);
				else
					msg_init(msg);
			break;

			case "newuser":
				if(typeof i_am_admin != "undefined")
					add_user_admin(new User(msg.user), false);
				else
					add_user(new User(msg.user), false);
			break;

			case "newadmin":
				u.isAdmin = true;
			break;

			case "noadmin":
				for (let usr of user_list)
				{
					if(usr.isAdmin)
						usr.isAdmin = false;
				}
			break;

			case "namechange":
				u.name = msg.name;
				break;

			case "lock":
				user_got_lock(msg.id);
				break;

			case "release":
				release_lock();
				break;
				
			case "answerqueue":
				if(typeof i_am_admin != "undefined")
					msg_answer_queue_admin(msg);
				else
					msg_answer_queue(msg);
				break;

			case "userleave":
				remove_user(msg.id);
				break;

			case "setquestion":
				msg_set_question(msg.question);
				break;

			case "setimage":
				msg_set_image(msg.id, msg.dataUrl);
				break;

			case "buzz":
				user_buzz(msg.id);
				break;
				
			case "scores":
				msg_show_scores(msg);
				break;
				
			case "scores_update":
				msg_scores_update(msg);
				break;

			default:
				console.log("Unknown message: " + msg.blah);
				break;
		}
	//}
}
function msg_init(msg)
{
	add_user(me, true);
	for (let u of msg.users) {
		add_user(new User(u), false);
	}
	//saved name
	let savedName = localStorage.getItem("name");
	if (savedName)
		document.getElementById("name_input").placeholder = savedName;
	else
		document.getElementById("name_input").placeholder = me.name;
	document.body.addEventListener("keyup", _enterNameKeyup);
	document.getElementById("name_input").addEventListener("keyup", _enterNameKeyup);
	//saved image
	let savedImage = localStorage.getItem("image");
	if(savedImage)
		request_image_change(savedImage);
	//screen transition
	document.getElementById("connection_screen").classList.add("hidden");
	document.getElementById("name_screen").classList.remove("hidden");
}
function msg_set_question(question)
{
	set_question(question);
	if(answering != null)
		release_lock();
	user_got_lock(get_admin().id);
}
function msg_answer_queue(message)
{
	if(message.list.length == 0)
		release_lock();
	else
		user_got_lock(message.list[0]);
}
function test_scores()
{
	let l = [
		{name: "Chicken Dinner", score: 10},
		{name: "Number Two", score: 9},
		{name: "Third Wheel", score: 8},
		{name: "User Thre-our", score: 7},
		{name: "Someone else", score: 6},
		{name: "Me", score: 5},
		{name: "Last Place", score: 4},
	];
	let blah = { list: l };
	msg_show_scores(blah);
}
function msg_show_scores(message)
{
	if(!document.getElementById("scores_screen").classList.contains("hidden"))
		return;
	document.getElementById("scores").innerHTML = "";
	let sorted = message.list.sort((a,b) => { b.score - a.score } );
	for(let m of sorted)
	{
		let row = document.createElement("tr");
		row.innerHTML = "<td>" + m.name + "</td><td>" + m.score + "</td>";
		document.getElementById("scores").appendChild(row);
	}
	hide_screen("all");
	show_screen("scores");
}
function user_got_lock(id)
{
	answering = id;
	let u = get_user(id);
	if(u.image && u.image != "default")
		document.getElementById("spotlight_avatar").src = u.image;
	else
		document.getElementById("spotlight_avatar").src = "usericon.png";
	document.getElementById("spotlight_name").innerHTML = u.name;
}
function release_lock()
{
	answering = null;

	let avt = document.getElementById("spotlight_avatar");
	avt.src = "white.jpg";
	document.getElementById("spotlight_name").innerHTML = "";
}
function set_question(question)
{
	let ele = document.getElementById("question");
	if (ele.classList.contains("hidden")) {
		ele.innerHTML = question;
		ele.classList.remove("hidden");
		ele.classList.add("locked");
	} else {
		ele.classList.add("hidden");
		setTimeout(function () { ele.querySelector("#question_text").innerHTML = question; ele.classList.remove("hidden"); ele.classList.add("locked");}, 1500);
	}
}
function msg_set_image(id, dataUrl)
{
	if(id == me.id)
	{
		me.image = dataUrl;
		localStorage.setItem("image", dataUrl);
	}
	else
	{
		get_user(id).image = dataUrl;
	}

	for(let ele of document.getElementsByClassName("user"))
	{
		if(ele.dataset.id != id)
			continue;
		if(dataUrl == "default")
			ele.querySelector("img").src = "white.jpg";
		else
			ele.querySelector("img").src = dataUrl;
		break;
	}
}


/*
 * WebSocket requests
 */
function ws_namechange(newname)
{
	conn.send(JSON.stringify({action: "setname", name: newname}));
}
function request_image_change(dataUrl)
{
	conn.send(JSON.stringify({action: "setimage", image: dataUrl}));
}
function request_lock()
{
	if(answering != me.id)
		conn.send(JSON.stringify({action: "lock"}));
}
function request_user_images()
{
	conn.send(JSON.stringify({action: "getimages"}));
}
/*
 * END WebSocket requests
 */


/*
 * Listeners
 */
function _enterNameKeyup(e) {
	if(e.code != "Enter" && e.code != "NumpadEnter" || typeof i_am_admin != "undefined")
		return;
	document.getElementById("name_input").removeEventListener("keyup", _enterNameKeyup);
	document.body.removeEventListener("keyup", _enterNameKeyup);
	let name = document.getElementById("name_input").value;
	if(name == "")
		name = document.getElementById("name_input").placeholder;
	if(me.name != name)
		ws_namechange(name);
	hide_screen("enter_name");
	show_screen("main");
}
/*
 * END Listeners
 */

document.addEventListener("DOMContentLoaded", function(e){
	document.body.addEventListener("dragover", function(e){
		e.preventDefault();
	});

	document.getElementById("name_input").value = "";
	let savedName = localStorage.getItem("name");
	if(savedName)
		document.getElementById("name_input").placeholder = savedName;

	let params = {};
	if(location.search)
		params = get_query_parameters();

	if(params.testing)
	{
		//fake users
		if(!params.fake_users)
		{
			params.fake_users = Number(prompt("Number of user icons"));
			if(Number.isNaN(params.fake_users))
				params.fake_users = 9;
		}
		for(var i = 1; i <= params.fake_users; ++i)
		{
			let adm = false;
			if (i == 1)
				adm = true;
			
			let blah = new User({
				id: i,
				name: "User"+i,
				isAdmin: adm
			});
			
			if (i == 1) {
				me = blah;
				if(typeof i_am_admin == "undefined")
					add_user(blah, true);
				else
					add_user_admin(blah);
			}
			else {
				if(typeof i_am_admin != "undefined")
					add_user_admin(blah);
				else
					add_user(blah, false);
			}
		}
		if(typeof i_am_admin != "undefined")
			draw_answer_queue([1,2,3,4]);
	}
	else
	{
		//setup websocket
		conn = new WebSocket(protocol + "//" + location.hostname + port + "/ws");
		conn.addEventListener("open", function(e){
			hide_screen("connecting");
			if(typeof i_am_admin == "undefined")
				show_screen("enter_name");
		});
		conn.addEventListener("message", ws_message);
		conn.addEventListener("close", function(e){
			hide_screen("all");
			show_screen("no_connection");
		});
	}

	let args = {
		"testing": params.testing,
		"theme": localStorage.getItem("theme") || "butter"
	}
	if(typeof i_am_admin != "undefined")
		args.theme = localStorage.getItem("admin_theme") || "butter";
	init_ui(args);
});
