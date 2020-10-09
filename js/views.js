var CellView = Backbone.View.extend({
	tagName: "li",
	initialize: function () {
		this.model.on('change', this.render, this);
	},
	render: function () {
		this.$el.html(this.model.get("value"));
		return this;
	}
});

var PointerView = Backbone.View.extend({
	el: "div.pointer",
	initialize: function (options) {
		this.model.on("change", this.render, this);
		this.interpreter = options.interpreter;
	},
	render: function () {
		this.$el.animate({
			"margin-left": this.model.get("index") * this.$el.width()
		}, 30);
		return this;
	}
});

var TapeView = Backbone.View.extend({
	el: ".tape",
	initialize: function (options) {
		this.pointer = options.pointer;
		this.interpreter = options.interpreter;
	},
	render: function () {
		_.forEach(this.model.models, function (model) {
			this.$el.append((new CellView({
				model: model
			})).render().el);
		}, this);

		new PointerView({
			model: this.pointer,
			interpreter: this.interpreter
		}).render();

		return this;
	}
});


var InterpreterView = Backbone.View.extend({
	delay: "90",
	el: "#interpreter",
	initialize: function (options) {
		this.pointer = options.pointer;
		this.tape = options.tape;
		this.editor = options.editor;
	},
	events: {
		"click #run": "run",
		"click #first-step": "firstStep",
		"click #step": "step",
		"click #pause": "pause",
		"click #continue": "loop",
		"click #stop": "stop",
		"change #input": "receiveInput",
		"change #delay": "changeDelay",
		"input #source": "setShareURL",
	},
	render: function () {
		this.input = this.$el.find("#input");
		this.output = this.$el.find("#output");
		this.preview = this.$el.find("#preview");
		this.buttons = new ButtonSwitchView({
			el: this.el
		}).render();

		new TapeView({
			model: this.tape,
			pointer: this.pointer,
			interpreter: this
		}).render();
		this.preview.hide();
		
	},
	
	showPreview: function () {
		this.preview.show();
		this.editor.hide();
	},
	showEditor: function () {
		this.preview.hide();
		this.editor.show();
	},
	begin: function () {
		this.interpreter = new Interpreter(
			this.editor.val(),
			this.tape,
			this.pointer,
			this.out.bind(this),
			this.awaitInput.bind(this),
			this.instruction.bind(this));

		this.interpreter.checkSyntax();

		this.reset();
		this.preview.empty();
		this.output.empty();
		this.output.removeClass("error");
		this.input.val("");

		this.showPreview();
	},
	error: function (e) {
		this.stop();
		if (e.name == "Error") {
			this.output.text(e.message);
			this.output.addClass("error");
		} else if (e.name != "End") {
			console.error(e);
		}
	},
	run: function () {
		this.buttons.run();
		try {
			this.begin();
			this.loop();
		} catch(e) {
			this.error(e);
		}
	},
	firstStep: function () {
		this.buttons.firstStep();
		try {
			this.begin();
			this.step();
		} catch (e) {
			this.error(e);
		}
	},
	out: function (cell) {
		this.output.append(cell.char());
	},
	awaitInput: function (cell) {
		this.input.parent().show();
		this.input.focus();
		this.pause();
		this.inputTarget = cell;
	},
	receiveInput: function () {
		this.inputTarget.put(this.input.val());
		this.input.parent().hide();
		this.input.val("");
		this.loop();
	},
	removeCaret: function () {
		this.editor
			.find("span.caret")
			.contents()
			.unwrap();
	},
	instruction: function(index) {
		this.removeCaret();

		var source = this.editor.val(),
			caret = $("<span>")
			.addClass("caret")
			.html(source.charAt(index));

		this.preview
			.empty()
			.append(source.substr(0, index))
			.append(caret)
			.append(source.substr(index + 1));
	},
	loop: function () {
		this.interval = setInterval(function () {
			this.step();
		}.bind(this), this.delay);
	},
	clearLoop: function () {
		clearInterval(this.interval);
		this.interval = null;
	},
	step: function () {
		try {
			this.interpreter.next($("#optimize").is(':checked'));
		} catch (e) {
			this.error(e);
		}
	},
	pause: function () {
		this.buttons.pause();
		this.clearLoop();
	},
	reset: function () {
		this.pointer.set("index", 0);
		_(this.tape.models).forEach(function (model) {
			model.set("value", 0);
		}, this);
	},
	stop: function () {
		this.clearLoop();
		this.reset();
		this.buttons.stop();
		this.showEditor();
	},
	changeDelay: function () {
		if (this.interval) {
			this.clearLoop();
			this.delay = $("#delay").val();
			this.loop();
		} else {
			this.delay = $("#delay").val();
		}
	}
});


var ButtonSwitchView = Backbone.View.extend({
	run: function () {
		console.log('hide run');
		this.$el.find("#run, #first-step").hide();
		this.$el.find("#stop, #pause").show();
		return false;
	},
	firstStep: function () {
		this.$el.find("#run, #first-step").hide();
		this.$el.find("#stop, #step, #continue").show();
		return false;
	},
	stop: function () {
		this.$el.find("#stop, #step, #pause, #continue").hide();
		this.$el.find("#run, #first-step").show();
		return false;
	},
	pause: function () {
		this.$el.find("#pause").hide();
		this.$el.find("#step, #continue").show();
		return false;
	},
	loop: function () {
		this.$el.find("#step, #continue").hide();
		this.$el.find("#pause").show();
		return false;
	}
});
