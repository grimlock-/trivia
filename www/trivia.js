var conn;
var users = [];
var me;
var answering = null;
var port = location.port ? ":" + location.port : "";
var protocol = location.protocol == "https:" ? "wss:" : "ws:";
var testing = false;
var fake_users;
if(location.search)
{
	let str = location.search.substring(1);
	let params = str.split('&');
	for(let param of params)
	{
		let parts = param.split('=');
		let val = parts[1];
		switch(parts[0])
		{
			case "testing":
				testing = true;
			break;

			case "users":
				fake_users = Number(val);
			break;
		}
	}
}


function User(values)
{
	this.id = values.id;
	this.name = values.name || "somebody";
	this.isAdmin = values.isAdmin || false;
	this.image = values.image || "default";

	var _fill = 0.25;
	var changingTimeout = 0;

	Object.defineProperty(this, "fill", {
 		configurable: false,
		get() { return _fill; },
		set(newVal) {
			if(newVal >= 1)
			{
				_fill = 1;
				let ele = document.querySelector(".user[data-id='"+this.id+"'] .fill");
				if(!ele)
					return;
				//ele.dataset.fill = 1;
			}
			else
			{
				_fill = newVal;
				let ele = document.querySelector(".user[data-id='"+this.id+"'] .fill");
				if(!ele)
					return;
				//ele.dataset.fill = newVal;
				ele.style.scale = newVal;
			}
		}
	});
}
function get_user(id)
{
	for(let u of users)
	{
		if(u.id == id)
			return u;
	}
	return null;
}
function get_admin()
{
	for(let u of users)
	{
		if(u.isAdmin)
			return u;
	}
	return null;
}
function add_user(u, self)
{
	users.push(u);
	var d = document.createElement("div");
	d.classList.add("user");
	if (self)
		d.classList.add("self");
	if(u.isAdmin)
		d.classList.add("admin");
	d.dataset.id = u.id;
	if(!u.image || u.image == "default")
		d.innerHTML = "<img class='usericon' src='usericon.png' width='70' height='70' /><div class='username'>" + u.name + "</div>";
	else
		d.innerHTML = "<img class='usericon' src='" + u.image + "' width='70' height='70' /><div class='username'>" + u.name + "</div>";
	if (self) {
		d.firstChild.addEventListener("click", function () {
			if (me.isAdmin) request_demote();
			else request_promote();
		});
		d.lastChild.addEventListener("click", start_editing_name);
	}
	document.getElementById("userlist").appendChild(d);
}
function remove_user(id)
{
	let u;
	for (let i = 0; i < users.length; ++i) {
		if (users[i].id === id)
			u = users.splice(i, 1);
	}
	for (let ele of document.getElementsByClassName("user")) {
		if (ele.dataset.id && ele.dataset.id == id) {
			ele.parentNode.removeChild(ele);
		}
	}
	if(answering == id)
		release_lock();
}


function ws_message(e)
{
	var msg = JSON.parse(e.data);
	if(!msg.blah)
		return;
	
	switch(msg.blah)
	{
		case "init":
			set_category(msg.category);
			me = new User(msg.you);
			add_user(me, true);
			for (let u of msg.users) {
				add_user(new User(u), false);
			}
			let savedName = localStorage.getItem("name");
			if (savedName && me.name != savedName)
				request_name_change(savedName);
			let savedImage = localStorage.getItem("image");
			if(savedImage)
			{
				request_image_change(savedImage);
			}
		break;
		
		case "newuser":
			add_user(new User(msg.user), false);
		break;
		
		case "newadmin":
			let u = get_user(msg.id);
			u.isAdmin = true;
			for (let ele of document.getElementsByClassName("user")) {
				if (ele.dataset.id == u.id) {
					ele.classList.add("admin");
					break;
				}
			}
			if (msg.id == me.id) {
				document.getElementById("category").addEventListener("click", start_editing_category);
				document.getElementById("spotlight_avatar").removeEventListener("mousedown", _spotlightDown);
				document.getElementById("spotlight_avatar").removeEventListener("mouseup", _spotlightUp);
				document.getElementById("spotlight_avatar").removeEventListener("mouseleave", _spotlightUp);
				document.getElementById("spotlight_avatar").addEventListener("click", admin_release_lock);
				//Create question input
				let new_ele = document.createElement("input");
				new_ele.className = "spec";
				new_ele.type = "text";
				new_ele.id = "question_input";
				new_ele.placeholder = "Question input";
				new_ele.addEventListener("focus", start_question_input);
				document.getElementById("qin_container").insertAdjacentElement("afterbegin", new_ele);
				//Question submit image
				new_ele = document.createElement("img");
				new_ele.id = "question_submit";
				new_ele.src = "arrow.svg";
				new_ele.width = new_ele.height = 24;
				new_ele.addEventListener("click", request_set_question);
				document.getElementById("question_input").insertAdjacentElement("afterend", new_ele);
				//Create answer input
				new_ele = document.createElement("input");
				new_ele.className = "spec";
				new_ele.type = "text";
				new_ele.id = "answer_input";
				new_ele.placeholder = "Answer input";
				new_ele.addEventListener("focus", start_question_input);
				document.getElementById("ain_container").insertAdjacentElement("afterbegin", new_ele);
				//Answer submit image
				new_ele = document.createElement("img");
				new_ele.id = "answer_submit";
				new_ele.src = "arrow.svg";
				new_ele.width = new_ele.height = 24;
				new_ele.addEventListener("click", request_show_answer);
				document.getElementById("answer_input").insertAdjacentElement("afterend", new_ele);
			}
		break;
		
		case "noadmin":
			if (me.isAdmin) {
				me.isAdmin = false;
				document.getElementById("category").removeEventListener("click", start_editing_category);
				if(answering != null)
				{
					document.getElementById("spotlight_avatar").removeEventListener("click", admin_release_lock);
				}
				else
				{
					document.getElementById("spotlight_avatar").addEventListener("mousedown", _spotlightDown);
					document.getElementById("spotlight_avatar").addEventListener("mouseup", _spotlightUp);
					document.getElementById("spotlight_avatar").addEventListener("mouseleave", _spotlightUp);
				}

				let ele = document.getElementById("question_input");
				ele.parentNode.removeChild(ele);
				ele = document.getElementById("answer_input");
				ele.parentNode.removeChild(ele);
				ele = document.getElementById("question_submit");
				ele.parentNode.removeChild(ele);
				ele = document.getElementById("answer_submit");
				ele.parentNode.removeChild(ele);
			} else {
				for (let u of users) {
					u.isAdmin = false;
				}
			}
			for (let ele of document.getElementsByClassName("admin")) {
				ele.classList.remove("admin");
			}
		break;
		
		case "namechange":
			if (msg.id == me.id)
				change_own_name(msg.name);
			else
				change_name(msg.id, msg.name);
			break;

		case "lock":
			user_got_lock(msg.id);
			break;

		case "release":
			release_lock();
			break;

		case "setanswer":
			show_answer(msg.answer);
			break;

		case "userleave":
			remove_user(msg.id);
			break;

		case "setquestion":
			set_question(msg.question);
			if(answering != null)
				release_lock();
			if(me.isAdmin)
				user_got_lock(me.id);
			break;

		case "setcategory":
			set_category(msg.category);
			break;

		case "setimage":
			set_image(msg.id, msg.dataUrl);
			break;

		/*case "buzz":
			user_buzz(msg.id);
			break;*/
	}
}
function change_name(id, name)
{
	get_user(id).name = name;
	for (let u of document.getElementsByClassName("user")) {
		if (u.dataset.id && u.dataset.id == id) {
			u.lastChild.innerHTML = name;
			break;
		}
	}
}
function change_own_name(name)
{
	localStorage.setItem("name", name);
	me.name = name;
	document.getElementsByClassName("user")[0].lastChild.innerHTML = name;
}
function user_got_lock(id)
{
	answering = id;
	let u = get_user(id);
	if(u.image == "default")
		document.getElementById("spotlight_avatar").src = "usericon.png";
	else
		document.getElementById("spotlight_avatar").src = u.image;
	document.getElementById("spotlight_name").innerHTML = u.name;
	if(me.isAdmin)
	{
		document.getElementById("spotlight_avatar").addEventListener("click", admin_release_lock);
	}
	document.getElementById("spotlight_avatar").removeEventListener("mousedown", _spotlightDown);
	document.getElementById("spotlight_avatar").removeEventListener("mouseup", _spotlightUp);
	document.getElementById("spotlight_avatar").removeEventListener("mouseleave", _spotlightUp);
}
function admin_release_lock()
{
	console.log("Requesting release");
	request_release();
}
function release_lock()
{
	answering = null;

	document.getElementById("question").classList.remove("locked");
	let avt = document.getElementById("spotlight_avatar");
	avt.src = "button2.png";
	avt.addEventListener("mousedown", _spotlightDown);
	avt.addEventListener("mouseup", _spotlightUp);
	avt.addEventListener("mouseleave", _spotlightUp);
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
		setTimeout(function () { ele.innerHTML = question; ele.classList.remove("hidden"); ele.classList.add("locked");}, 1500);
	}
	let ele2 = document.getElementById("answer");
	if(!ele2.classList.contains("hidden"))
		ele2.classList.add("hidden");
}
function show_answer(answer)
{
	document.getElementById("answer").innerHTML = answer;
	let ele = document.getElementById("answer");
	if(ele.classList.contains("hidden"))
		ele.classList.remove("hidden");
}
function set_category(category)
{
	document.getElementById("category").innerHTML = category;
}
function set_image(id, dataUrl)
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
			ele.firstChild.src = "usericon.png";
		else
			ele.firstChild.src = dataUrl;
		break;
	}
}


function start_editing_name()
{
	this.innerHTML = "<input type='text' id='name_edit' />";
	this.firstChild.value = me.name;
	this.removeEventListener("click", start_editing_name);
	this.addEventListener("focusout", finish_editing_name)
	document.body.removeEventListener("keyup", spacebar_listener);
}
function finish_editing_name()
{
	let newname = this.firstChild.value;
	this.removeEventListener("focusout", finish_editing_name);
	this.innerHTML = me.name;
	this.addEventListener("click", start_editing_name);
	document.body.addEventListener("keyup", spacebar_listener);
	request_name_change(newname);
}
function start_question_input()
{
	this.addEventListener("focusout", finish_question_input);
	document.body.removeEventListener("keyup", spacebar_listener);
}
function finish_question_input()
{
	this.removeEventListener("focusout", finish_question_input);
	this.addEventListener("focus", start_question_input);
	document.body.addEventListener("keyup", spacebar_listener);
}
function start_editing_category()
{
	let cat = this.innerHTML;
	this.innerHTML = "<input type='text' />";
	this.firstChild.className = "spec";
	this.firstChild.value = cat;
	this.firstChild.size = cat.length;
	this.removeEventListener("click", start_editing_category);
	this.addEventListener("input", category_input_length);
	this.addEventListener("focusout", finish_editing_category);
	document.body.removeEventListener("keyup", spacebar_listener);
}
function category_input_length(e)
{
	let len = this.firstChild.value.length;
	if(!len)
		len = 1;
	this.firstChild.size = len;
}
function finish_editing_category()
{
	let cat = this.firstChild.value;
	this.innerHTML = "Category";
	this.removeEventListener("focusout", finish_editing_category);
	this.removeEventListener("input", category_input_length);
	this.addEventListener("click", start_editing_category);
	document.body.addEventListener("keyup", spacebar_listener);
	request_category_change(cat.length == 0 ? "Category" : cat);
}
function spacebar_listener(e)
{
	if(e.code == "Space")
		request_lock();
}
function user_buzz(id)
{
	let userObj = get_user(id);
	userObj.fill = userObj.fill + 0.12;
}




/*
 * WebSocket requests
 */
function request_name_change(newname)
{
	conn.send(JSON.stringify({ action: "setname", name: newname }));
}
function request_set_question()
{
	let question = document.getElementById("question_input").value;
	console.log(question);
	document.getElementById("question_input").value = "";
	conn.send(JSON.stringify({ action: "setquestion", question: question }));
}
function request_show_answer()
{
	let answer = document.getElementById("answer_input").value;
	console.log(answer);
	document.getElementById("answer_input").value = "";
	conn.send(JSON.stringify({ action: "setanswer", answer: answer }));
}
function request_image_change(dataUrl)
{
	conn.send(JSON.stringify({ action: "setimage", image: dataUrl }));
}
function request_promote()
{
	conn.send(JSON.stringify({ action: "promote" }));
}
function request_demote()
{
	conn.send(JSON.stringify({ action: "demote" }));
}
function request_category_change(category)
{
	conn.send(JSON.stringify({ action: "setcategory", category: category}));
}
function request_lock()
{
	if(answering != me.id && !me.isAdmin)
		conn.send(JSON.stringify({ action: "lock" }));
}
function request_release()
{
	conn.send(JSON.stringify({ action: "release" }));
}
/*
 * END WebSocket requests
 */


function _spotlightDown(e) {
	this.src = "button3.png";
	if(conn.readyState == 1)
		request_lock();
}
function _spotlightUp(e) {
	this.src = "button2.png";
}
document.addEventListener("pagehide", function (e) {
	if (conn)
		conn.close();
});
document.addEventListener("DOMContentLoaded", function(e){
	document.body.addEventListener("dragover", function(e){
		e.preventDefault();
	});
	document.body.addEventListener("drop", function(e){
		e.preventDefault();
	
		if (e.dataTransfer.items)
		{
			//DataTransferItemList interface
			for (let itm of e.dataTransfer.items)
			{
				if(itm.kind !== 'file')
					continue;
				
				var file = itm.getAsFile();
				if(!file.type.startsWith("image/"))
					continue;

				let reader = new FileReader();
				reader.onload = function(e) {
					//me.image = e.target.result;
					request_image_change(e.target.result);
				};
				reader.readAsDataURL(file);
			}
		}
		/*else
		{
			//DataTransfer interface
			for (let itm of e.dataTransfer.files)
			{
				console.log("DataTransfer: " + itm.name);
			}
		}*/
	});

	if(testing)
	{
		//fake users
		if(!fake_users)
		{
			fake_users = Number(prompt("Number of user icons"));
			if(Number.isNaN(fake_users))
				fake_users = 9;
		}
		for(var i = 1; i <= fake_users; ++i)
		{
			let blah = new User({
				id: i,
				name: "User"+i,
				isAdmin: false
			});
			if (i == 1) {
				me = blah;
				me.isAdmin = false;
				add_user(blah, true);
			}
			else {
				add_user(blah, false);
			}
		}

		document.body.addEventListener("keyup", function(e){
			if(e.code == "Space")
				user_buzz(me.id);
		});
	}
	else
	{
		document.body.addEventListener("keyup", spacebar_listener);

		//setup websocket
		conn = new WebSocket(protocol + "//" + location.hostname + port + "/ws");
		conn.addEventListener("message", ws_message);
		conn.addEventListener("close", function(e){
			let notice = document.createElement("div");
			notice.classList = "no_connection_notice";
			notice.innerHTML = "No connection to server!";
			document.body.appendChild(notice);
		});
	}

	document.getElementById("spotlight_avatar").addEventListener("mousedown", _spotlightDown);
	document.getElementById("spotlight_avatar").addEventListener("mouseup", _spotlightUp);
	document.getElementById("spotlight_avatar").addEventListener("mouseleave", _spotlightUp);
});

