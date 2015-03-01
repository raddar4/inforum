Router.configure({
	layoutTemplate: 'ApplicationLayout'
});

Router.route('/', function(){this.render('main');});
Router.route('/groups', function(){
  if(Meteor.user()){
    this.render('groups');
  }else{
    this.next();
  }
});
Router.route('/chat/:id', function() {
  var id = ""+this.params.id;
  Meteor.call('joinChat', id);
  this.wait(Meteor.subscribe('room'));
  this.render('chat');
});

NotesData = new Mongo.Collection("notes");
UserData = new Mongo.Collection("users_client");
GroupsData = new Mongo.Collection("groups_client");

if (Meteor.isClient) {

  Meteor.subscribe('usersData');
  Meteor.subscribe('groups_fb');

  Accounts.ui.config({
    requestPermissions: {
      facebook: [
        'user_friends',
        'public_profile'
      ],
    }
  });

  var query = new ReactiveVar();
  query = new RegExp(/()/gi);
  var _dep = new Deps.Dependency();

  Template.groups.helpers({
    'link': function() {
      if(Meteor.user().services.facebook){
        return "http://graph.facebook.com/" + Meteor.user().services.facebook.id + "/picture/?type=large";
      }
    },
    'name': function() {
      if(Meteor.user().services.facebook){
        return Meteor.user().profile.name;
      }
    },
    'groups': function() {
      _dep.depend();
      return GroupsData.find({name: query}).fetch().reverse();
    },
    'mygroups': function() {
      return GroupsData.find({people: Meteor.user()._id}).fetch();
    }
  });

  Template.groups.events({
    'click #addGroup': function () {
      var name = $('#groupName').val();
      var group = {
        name: name,
        id: generateUUID(),
        people: [Meteor.user()._id]
      }
      Meteor.call('addgroup', group);
    },
    'keyup #groupSearch': function(e) {
       var text = $('#groupSearch').val().trim();
       //Meteor.call('searchGroups', text);
       var regExp = buildRegExp(text);
       query = regExp;
       console.log(query);
       _dep.changed();
    },
    'click .joinGroup': function(event) {
      var id = event.target.id;
      Meteor.call('joinGroup', Meteor.user()._id, id);
    }
  });

  Template.main.events({
    'click .login-button': function () {
      Meteor.setTimeout(function() {
        if(Meteor.user()){
          window.location="groups";
        }
      }, 2000);
    }
  });

  Template.chat.rendered = function() {
    bootbox.prompt("What is your name?", function(result) {
      Session.set('username', result);
    });
  }

  Template.chat.events({
		'click #add' : function () {
			if(!$('#noteInput').val().match(/^\s*$/)){
				var note = {
            name: Session.get('username'),
            room: window.location.pathname.slice(6),
						text: $('#noteInput').val(),
            time: moment().format('MMMM Do, h:mm:ss a')
				};
				Meteor.call('addNote', note);
			}
			$('#noteInput').val('');
			$('#noteInput').focus();
		},
		'keypress input' : function (event) {
			if(event.which===13){
				if(!$('#noteInput').val().match(/^\s*$/)){
					var note = {
            name: Session.get('username'),
            room: window.location.pathname.slice(6),
						text: $('#noteInput').val(),
            time: moment().format('MMMM Do, h:mm:ss a')
					};
					Meteor.call('addNote', note);
				}
				$('#noteInput').val('');
			}
		}
	});

	Template.chat.helpers({
		notes: function() {
			return NotesData.find({room: window.location.pathname.slice(6)}).fetch();
		}
	});

	Template.note.rendered = function() {
		$('#notesdata').scrollTop($('#notesdata').prop("scrollHeight"));
	}

	Handlebars.registerHelper('linkify', function(text){
		var linkedText = Autolinker.link(text, {stripPrefix: false});
		var url = new RegExp(/<a\b[^>]*>(.*?)<\/a>/g);
		var str = Handlebars._escape("");
		while(match = url.exec(linkedText)){
			str += Handlebars._escape(linkedText.substring(0, match.index));
			str += linkedText.substring(match.index, match.index+match[0].length);
			linkedText = linkedText.substring(match.index+match[0].length);
			url.lastIndex = 0;
		}
		str += Handlebars._escape(linkedText);
		return new Handlebars.SafeString(str);
	});

  function buildRegExp(searchText) {
    // this is dumb implementation
    var parts = searchText.trim().split(' ');
    return new RegExp("(" + parts.join('|') + ")", "ig");
  }

  function generateUUID() {
    var d = Date.now();
    var uuid = 'xxxx-4xxx-yxxx'.replace(/[xy]/g,function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x7|0x8)).toString(16);
    });
    return uuid;
  }
}
