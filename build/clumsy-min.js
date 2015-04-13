var game = {
    data: {
        score : 0,
        steps: 0,
        start: false,
        newHiScore: false,
        muted: false
    },

    "onload": function() {
        if (!me.video.init("screen", me.video.CANVAS, 900, 600, true, 'auto')) {
            alert("Your browser does not support HTML5 canvas.");
            return;
        }
        me.audio.init("mp3,ogg");

        me.loader.onload = this.loaded.bind(this);
        me.loader.preload(game.resources);
        me.state.change(me.state.LOADING);
        
        // add "#debug" to the URL to enable the debug Panel
        if (document.location.hash === "#debug") {
            window.onReady(function () {
                me.plugin.register.defer(this, me.debug.Panel, "debug", me.input.KEY.V);
            });
        }

    },

    "loaded": function() {
        me.state.set(me.state.MENU, new game.TitleScreen());
        me.state.set(me.state.PLAY, new game.PlayScreen());
        me.state.set(me.state.GAME_OVER, new game.GameOverScreen());

        me.input.bindKey(me.input.KEY.SPACE, "fly", true);
        me.input.bindKey(me.input.KEY.M, "mute", true);
        me.input.bindPointer(me.input.KEY.SPACE);
        me.input.bindKey(me.input.KEY.G,"invert_gravity",true);

        me.pool.register("clumsy", BirdEntity);
        me.pool.register("pipe", PipeEntity, true);
        me.pool.register("hit", HitEntity, true);
        me.pool.register("ground", Ground, true);
        // me.pool.register("rainbow",RainbowEntity,true);


        // in melonJS 1.0.0, viewport size is set to Infinity by default
        me.game.viewport.setBounds(0, 0, 900, 600);
        me.state.change(me.state.MENU);

        
    },

    "onLevelLoaded": function() {
        // this.birdy = ;
    }
};

game.resources = [
    // images
    {name: "bg", type:"image", src: "data/img/bg.png"},
    {name: "clumsy", type:"image", src: "data/img/clumsy.png"},
    {name: "cat", type:"image", src: "data/img/cat.png"},
    {name: "pipe0", type:"image", src: "data/img/pipe0.png"},
    {name: "pipe1", type:"image", src: "data/img/pipe1.png"},
    {name: "pipe2", type:"image", src: "data/img/pipe2.png"},
    {name: "pipe3", type:"image", src: "data/img/pipe3.png"},
    {name: "logo", type:"image", src: "data/img/logo.png"},
    {name: "ground", type:"image", src: "data/img/ground.png"},
    {name: "gameover", type:"image", src: "data/img/gameover.png"},
    {name: "gameoverbg", type:"image", src: "data/img/gameoverbg.png"},
    {name: "hit", type:"image", src: "data/img/hit.png"},
    {name: "getready", type:"image", src: "data/img/getready.png"},
    {name: "new", type:"image", src: "data/img/new.png"},
    {name: "share", type:"image", src: "data/img/share.png"},
    {name: "tweet", type:"image", src: "data/img/tweet.png"},
    {name: "rainbow", type:"image", src: "data/img/rainbow.png"},
    // sounds
    {name: "theme", type: "audio", src: "data/bgm/"},
    {name: "theme_nyan", type: "audio", src: "data/bgm/"},
    {name: "hit", type: "audio", src: "data/sfx/"},
    {name: "lose", type: "audio", src: "data/sfx/"},
    {name: "wing", type: "audio", src: "data/sfx/"},
];
var BirdEntity = me.Entity.extend({
    init: function(x, y) {
        var settings = {};
        settings.image = me.loader.getImage('cat');
        settings.width = 85;
        settings.height = 60;
        settings.spritewidth = 68;
        settings.spriteheight= 42;

        this._super(me.Entity, 'init', [x, y, settings]);

        this.alwaysUpdate = true;
        this.body.gravity = 0.2;
        this.gravityForce = 0.01;
        
        // gravity inverted === 1
        this.gravityInverted = 0;
        this.gravityInvertFlag = 0;

        // constants for fast reference
        this.maxAngleRotationUp = -Math.PI/6; 
        this.maxAngleRotationDown = Math.PI/6;
        this.maxAngleRotationUpExtreme = -Math.PI/2;
        this.maxAngleRotationDownExtreme = Math.PI/2;
        this.gravityAngleGradient = Number.prototype.degToRad(0.5);

        this.renderable.addAnimation("flying", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        this.renderable.addAnimation("idle", [0]);
        this.renderable.setCurrentAnimation("flying");
        this.renderable.anchorPoint = new me.Vector2d(0.1, 0.5);
        
        // manually add a rectangular collision shape
        this.body.addShape(new me.Rect(5, 5,68, 42));

        // a tween object for the flying physic effect
        this.flyTween = new me.Tween(this.pos);
        this.flyTween.easing(me.Tween.Easing.Exponential.InOut);
        

        // end animation tween
        this.endTween = null;

        // collision shape
        this.collided = false;

        this.name = "clumsy";
        this.lol_count = 0;
        var that = this;
        this.flyTween.onUpdate(function() {            
            var ag =  that.gravityInverted === 0 ? that.renderable.angle + 30: -that.renderable.angle -30; 
            // for(i = -20; i <= 0; i += 5) {
                // me.game.world.addChild(new RainbowEntity(that.pos.x - 10 ,that.pos.y, ag));
            // }

        });

    },

    update: function(dt) {
        // mechanics

        if (!game.data.start) {
            return this._super(me.Entity, 'update', [dt]);
        }
        
        // trying to invert gravity
        if(me.input.isKeyPressed('invert_gravity') || this.gravityInvertFlag === 1) {
            
            if(this.gravityInverted === 0)  {
                this.gravityInverted = 1;
                this.gravityForce = -0.01;
                this.renderable.angle = 0;
            }
            else {
                this.gravityInverted = 0;
                this.gravityForce = 0.01;
                this.renderable.angle = 0;
            }

            this.renderable.flipY(this.gravityInverted === 1);
            this.gravityInvertFlag = 0;

        }

        //hardcoded this to avoid multiple comparisons and increase performance

        if(this.gravityInverted === 0) { //normal gravity
            if (me.input.isKeyPressed('fly')) {
                
                me.audio.play('wing');
                this.gravityForce = 0.02;
                var currentPos = this.pos.y;

                // stop the previous tweens
                this.flyTween.stop();
                this.flyTween.to({y: currentPos - 62 }, 100);
                

                this.flyTween.start();
                this.renderable.angle = this.maxAngleRotationUp;
            } else {
                //accelerate
                this.gravityForce += 0.2;

                //change position according to acceleration
                this.pos.y += me.timer.tick * this.gravityForce;
                //nose dive the player
                this.renderable.angle += this.gravityAngleGradient * this.gravityForce;
                //ensure player doesn't rotate
                if(this.renderable.angle > this.maxAngleRotationDownExtreme)
                    this.renderable.angle = this.maxAngleRotationDownExtreme;

            }
        } else { //inverted gravity
            if (me.input.isKeyPressed('fly')) {
                
                me.audio.play('wing');
                this.gravityForce = -0.02;
                var currentPos = this.pos.y;

                // stop the previous tweens
                this.flyTween.stop();
                this.flyTween.to({y: currentPos + 62}, 100);
                // this.flyTween.onUpdate(new function() {
                //       me.game.world.addChild(new RainbowEntity(this._object.pos.x - 10,this._object.pos.y));

                //     });
                this.flyTween.start();
                this.renderable.angle = -this.maxAngleRotationDown;
            } else {
                //accelerate
                this.gravityForce -= 0.2;
                //change position according to acceleration
                this.pos.y += me.timer.tick * this.gravityForce;
                //nose dive the player
                this.renderable.angle -= this.gravityAngleGradient * this.gravityForce;
                //ensure player doesn't rotate
                if(this.renderable.angle > this.maxAngleRotationDownExtreme) // don't fuck with this
                    this.renderable.angle = this.maxAngleRotationDownExtreme; // you've been warned

            }
        }

        
        me.game.world.addChild(new RainbowEntity(this.pos.x - 10,this.pos.y,
            this.gravityInverted === 0 ? this.renderable.angle : -this.renderable.angle));
       

        var hitSky = -100; // bird hardcodedeight + 20px //changed it to something else
        if (this.pos.y <= hitSky || this.collided) {
            game.data.start = false;
            me.audio.play("lose");
            this.endAnimation();
            return false;
        }
        me.collision.check(this);
        this.updateBounds();
        this._super(me.Entity, 'update', [dt]);

        return true;
    },

    onCollision: function(response) {
        
        var obj = response.b;
        // if(obj.type === 'rainbow')
        //     return;
        if (obj.type === 'pipe' || obj.type === 'ground') {
                me.device.vibrate(500);
                this.collided = true;
            }
        
            // remove the hit box
            if (obj.type === 'hit') {
                me.game.world.removeChildNow(obj);
                game.data.steps++;
                me.audio.play('hit');
                this.pos.x = 60;

                if(obj.gravityInverter === true) { 
                    
                    this.flyTween.stop();
                    if(this.gravityInverted === 0)  {
                        this.gravityInverted = 1;
                        this.gravityForce = -0.005;
                        this.renderable.angle = 0;
                    }
                    else {
                        this.gravityInverted = 0;
                        this.gravityForce = 0.005;
                        this.renderable.angle = 0;
                    }

                    this.renderable.flipY(this.gravityInverted === 1);
                    
                    if(this.gravityInverted === 0) 
                        this.pos.y = obj.pos.y;
                    else
                        this.pos.y = obj.pos.y - 18;
                    console.log("o " + obj.pos.y + " b " + this.pos.y);
                    this.updateBounds();
                    // me.state.pause(true);
                    // this.gravityInvertFlag = 1;
                }
            }
                
    },

    endAnimation: function() {
        me.game.viewport.fadeOut("#fff", 100);
        var currentPos = this.renderable.pos.y;
        this.endTween = new me.Tween(this.renderable.pos);
        this.endTween.easing(me.Tween.Easing.Exponential.InOut);

        this.flyTween.stop();
        this.renderable.angle = this.maxAngleRotationDown;
        var finalPos = me.video.renderer.getHeight() - this.renderable.width/2 - 96;
        this.endTween
            .to({y: currentPos}, 1000)
            .to({y: finalPos}, 1000)
            .onComplete(function() {
                me.state.change(me.state.GAME_OVER);
            });
        this.endTween.start();
    },

    externallyInvertGravity: function() {

        
    },

});


var PipeEntity = me.Entity.extend({
    init: function(x, y, pipe_no) {
        var settings = {};
        settings.image = this.image = me.loader.getImage('pipe1');
        settings.width = 148;
        settings.height= 1664;
        settings.spritewidth = 148;
        settings.spriteheight= 1664;

        this._super(me.Entity, 'init', [x, y, settings]);
        this.alwaysUpdate = true;
        this.body.addShape(new me.Rect(0 ,0, settings.width, settings.height));
        this.body.gravity = 0;
        this.body.vel.set(-5, 0);
        this.type = 'pipe';
    },

    update: function(dt) {
        // mechanics
        if (!game.data.start) {
            return this._super(me.Entity, 'update', [dt]);
        }
        this.pos.add(this.body.vel);
        if (this.pos.x < -this.image.width) {
            me.game.world.removeChild(this);
        }
        this.updateBounds();
        this._super(me.Entity, 'update', [dt]);
        return true;
    },

});

var PipeGenerator = me.Renderable.extend({
    init: function() {
        this._super(me.Renderable, 'init', [0, me.game.viewport.width, me.game.viewport.height]);
        this.alwaysUpdate = true;
        this.generate = 0;
        this.pipeFrequency = 92;
        this.pipeHoleSize = 1240;
        this.gravityInvertCounter = 1;
        this.gravityInvertFrequency =  Number.prototype.random(1,15);
        // console.log(" random number " + this.gravityInvertFrequency);
        this.posX = me.game.viewport.width;
        

    },

    update: function(dt) {
        // return;
        if ((this.generate++) === this.pipeFrequency) {
            this.generate = 0;
            var posY = Number.prototype.random(
                    me.video.renderer.getHeight() - 100,
                    200
            );
             var posY2 = posY - me.video.renderer.getHeight() - this.pipeHoleSize;
            // console.log("RH " + me.video.renderer.getHeight());
            var pipe_no =  Number.prototype.random(0,3);
            var pipe1 = new me.pool.pull('pipe', this.posX, posY, pipe_no);
            var pipe2 = new me.pool.pull('pipe', this.posX, posY2, pipe_no);
            var hitPos = posY - 100;
            var hit;

            if ((this.gravityInvertCounter++) === this.gravityInvertFrequency) {

                this.gravityInvertCounter = 1;
                // this.gravityInvertFrequency = Math.round(Math.random()*10 +1);
                this.gravityInvertFrequency = Number.prototype.random(1,15);
                // console.log(" random number " + this.gravityInvertFrequency);
                
                hit = new me.pool.pull("hit", this.posX, hitPos,true); 

            } else  {
                hit = new me.pool.pull("hit", this.posX, hitPos,false);
            }

            pipe1.renderable.flipY(true);
            // var temp = (posY - this.pipeHoleSize);
            // console.log("p " + posY + "p2 " + temp);
            me.game.world.addChild(pipe1, 10);
            me.game.world.addChild(pipe2, 10);
            me.game.world.addChild(hit, 11);
        }


        this._super(me.Entity, "update", [dt]);
        return true;
    },

});

var HitEntity = me.Entity.extend({
    init: function(x, y, inverter) {
        var settings = {};
        settings.image = this.image = me.loader.getImage('hit');
        settings.width = 148;
        settings.height= 60;
        settings.spritewidth = 148;
        settings.spriteheight= 60;

        this._super(me.Entity, 'init', [x, y, settings]);
        this.alwaysUpdate = true;
        this.body.gravity = 0;
        this.updateTime = false;
        this.renderable.alpha = 0;
        this.body.accel.set(-5, 0);
        this.body.addShape(new me.Rect(0, 0, settings.width - 30, settings.height - 30));
        this.type = 'hit';
        this.gravityInverter = inverter;

    },

    update: function(dt) {
        // mechanics
        this.pos.add(this.body.accel);
        if (this.pos.x < -this.image.width) {
            me.game.world.removeChild(this);
        }
        this.updateBounds();
        this._super(me.Entity, "update", [dt]);
        return true;
    },

});

var Ground = me.Entity.extend({
    init: function(x, y) {
        var settings = {};
        settings.image = me.loader.getImage('ground');
        settings.width = 900;
        settings.height= 96;
        this._super(me.Entity, 'init', [x, y, settings]);
        this.alwaysUpdate = true;
        this.body.gravity = 0;
        this.body.vel.set(-4, 0);
        this.body.addShape(new me.Rect(0 ,0, settings.width, settings.height));
        this.type = 'ground';
    },

    update: function(dt) {
        // mechanics
        this.pos.add(this.body.vel);
        if (this.pos.x < -this.renderable.width) {
            this.pos.x = me.video.renderer.getWidth() - 10;
        }
        this.updateBounds();
        return this._super(me.Entity, 'update', [dt]);
    },

});

var RainbowEntity = me.Entity.extend({
    init: function(x,y,angle) {
        var settings = {};
        settings.image = me.loader.getImage('rainbow');
        settings.width = 20;
        settings.height = 36;
        this._super(me.Entity,'init',[x,y,settings]);
        this.alwaysUpdate = true;
        this.body.gravity = 0;
        this.body.vel.set(-6,0);
        this.body.addShape(new me.Rect(0,0,settings.width,settings.height));
        this.renderable.angle = angle;
        this.body.collisionType = me.collision.types.NO_OBJECT;
        this.type = 'rainbow';

    },

    update: function(dt) {
        this.pos.add(this.body.vel);
        if(this.pos.x < -this.renderable.width) {
            me.game.world.removeChild(this);
        }
        this.updateBounds();
        return this._super(me.Entity, 'update', [dt]);

    },
});

game.HUD = game.HUD || {};

game.HUD.Container = me.Container.extend({
    init: function() {
        // call the constructor
        this._super(me.Container, 'init');
        // persistent across level change
        this.isPersistent = true;

        // non collidable
        this.collidable = false;

        // make sure our object is always draw first
        this.z = Infinity;

        // give a name
        this.name = "HUD";

        // add our child score object at the top left corner
        this.addChild(new game.HUD.ScoreItem(5, 5));
    }
});


/**
 * a basic HUD item to display score
 */
game.HUD.ScoreItem = me.Renderable.extend({
    /**
     * constructor
     */
    init: function(x, y) {
        // call the parent constructor
        // (size does not matter here)
        this._super(me.Renderable, "init", [x, y, 10, 10]);

        // local copy of the global score
        this.stepsFont = new me.Font('gamefont', 80, '#000', 'center');

        // make sure we use screen coordinates
        this.floating = true;
    },

    draw: function (renderer) {
        var context = renderer.getContext();
        if (game.data.start && me.state.isCurrent(me.state.PLAY))
            this.stepsFont.draw(context, game.data.steps, me.video.renderer.getWidth()/2, 10);
    }

});

var BackgroundLayer = me.ImageLayer.extend({
    init: function(image, z, speed) {
        name = image;
        width = 900;
        height = 600;
        ratio = 1;
        // call parent constructor
        this._super(me.ImageLayer, 'init', [name, width, height, image, z, ratio]);
    },

    update: function() {
        if (me.input.isKeyPressed('mute')) {
            game.data.muted = !game.data.muted;
            if (game.data.muted){
                me.audio.disable();
            }else{
                me.audio.enable();
            }
        }
        return true;
    }
});

var Share = me.GUI_Object.extend({
    init: function(x, y) {
        var settings = {};
        settings.image = "share";
        settings.spritewidth = 150;
        settings.spriteheight = 75;
        this._super(me.GUI_Object, 'init', [x, y, settings]);
    },

    onClick: function(event) {
        var shareText = 'Just made ' + game.data.steps + ' steps on Clumsy Bird! Can you beat me? Try online here!';
        var url = 'http://ellisonleao.github.io/clumsy-bird/';
        FB.ui(
            {
             method: 'feed',
             name: 'My Clumsy Bird Score!',
             caption: "Share to your friends",
             description: (
                    shareText
             ),
             link: url,
             picture: 'http://ellisonleao.github.io/clumsy-bird/data/img/clumsy.png'
            }
        );
        return false;
    }

});

var Tweet = me.GUI_Object.extend({
    init: function(x, y) {
        var settings = {};
        settings.image = "tweet";
        settings.spritewidth = 152;
        settings.spriteheight = 75;
        this._super(me.GUI_Object, 'init', [x, y, settings]);
    },

    onClick: function(event) {
        var shareText = 'Just made ' + game.data.steps + ' steps on Clumsy Bird! Can you beat me? Try online here!';
        var url = 'http://ellisonleao.github.io/clumsy-bird/';
        var hashtags = 'clumsybird,melonjs'
        window.open('https://twitter.com/intent/tweet?text=' + shareText + '&hashtags=' + hashtags + '&count=' + url + '&url=' + url, 'Tweet!', 'height=300,width=400')
        return false;
    }

});

game.TitleScreen = me.ScreenObject.extend({
    init: function(){
        this._super(me.ScreenObject, 'init');
        this.font = null;
        this.ground1 = null;
        this.ground2 = null;
        this.logo = null;
    },

    onResetEvent: function() {
        me.audio.stop("theme_nyan");
        game.data.newHiScore = false;

        me.game.world.addChild(new BackgroundLayer('bg', 1));
        me.input.bindKey(me.input.KEY.ENTER, "enter", true);
        me.input.bindKey(me.input.KEY.SPACE, "enter", true);
        me.input.bindPointer(me.input.mouse.LEFT, me.input.KEY.ENTER);

        this.handler = me.event.subscribe(me.event.KEYDOWN, function (action, keyCode, edge) {
            if (action === "enter") {
                me.state.change(me.state.PLAY);
            }
        });

        //logo
        var logoImg = me.loader.getImage('logo');
        this.logo = new me.Sprite(
            me.game.viewport.width/2 - 170,
            -logoImg,
            logoImg
        );
        me.game.world.addChild(this.logo, 10);

        var that = this;
        var logoTween = me.pool.pull("me.Tween", this.logo.pos)
            .to({y: me.game.viewport.height/2 - 100}, 1000)
            .easing(me.Tween.Easing.Exponential.InOut).start();

        // this.ground1 = me.pool.pull("ground", 0, me.video.renderer.getHeight() - 96);
        // this.ground2 = me.pool.pull("ground", me.video.renderer.getWidth(),
                                    // me.video.renderer.getHeight() - 96);
        // me.game.world.addChild(this.ground1, 11);
        // me.game.world.addChild(this.ground2, 11);

        me.game.world.addChild(new (me.Renderable.extend ({
            // constructor
            init: function() {
                // size does not matter, it's just to avoid having a zero size
                // renderable
                this._super(me.Renderable, 'init', [0, 0, 100, 100]);
                this.text = me.device.touch ? 'Tap to start' : 'PRESS SPACE OR CLICK LEFT MOUSE BUTTON TO START \n\t\t\t\t\t\t\t\t\t\t\tPRESS "M" TO MUTE SOUND';
                this.font = new me.Font('gamefont', 20, '#000');
            },
            draw: function (renderer) {
                var context = renderer.getContext();
                var measure = this.font.measureText(context, this.text);
                var xpos = me.game.viewport.width/2 - measure.width/2;
                var ypos = me.game.viewport.height/2 + 50;
                this.font.draw(context, this.text, xpos, ypos);
            }
        })), 12);
    },

    onDestroyEvent: function() {
        // unregister the event
        me.event.unsubscribe(this.handler);
        me.input.unbindKey(me.input.KEY.ENTER);
        me.input.unbindKey(me.input.KEY.SPACE);
        me.input.unbindPointer(me.input.mouse.LEFT);
        this.ground1 = null;
        this.ground2 = null;
        me.game.world.removeChild(this.logo);
        this.logo = null;
    }
});

game.PlayScreen = me.ScreenObject.extend({
    init: function() {
        me.audio.play("theme_nyan", true);
        // lower audio volume on firefox browser
        var vol = me.device.ua.contains("Firefox") ? 0.3 : 0.5;
        me.audio.setVolume(vol);
        this._super(me.ScreenObject, 'init');
    },

    onResetEvent: function() {
        me.game.reset();
        me.audio.stop("theme_nyan");
        if (!game.data.muted){
            me.audio.play("theme_nyan", true);
        }

        me.input.bindKey(me.input.KEY.SPACE, "fly", true);
        game.data.score = 0;
        game.data.steps = 0;
        game.data.start = false;
        game.data.newHiscore = false;

        me.game.world.addChild(new BackgroundLayer('bg', 1));

        // this.ground1 = me.pool.pull('ground', 0, me.video.renderer.getHeight() - 96);
        // this.ground2 = me.pool.pull('ground', me.video.renderer.getWidth(),
        //                             me.video.renderer.getHeight() - 96);
        // me.game.world.addChild(this.ground1, 11);
        // me.game.world.addChild(this.ground2, 11);

        this.HUD = new game.HUD.Container();
        me.game.world.addChild(this.HUD);

        this.bird = me.pool.pull("clumsy", 60, me.game.viewport.height/2 - 100);
        me.game.world.addChild(this.bird, 10);

        //inputs
        me.input.bindPointer(me.input.mouse.LEFT, me.input.KEY.SPACE);

        this.getReady = new me.Sprite(
            me.video.renderer.getWidth()/2 - 200,
            me.video.renderer.getHeight()/2 - 100,
            me.loader.getImage('getready')
        );
        me.game.world.addChild(this.getReady, 11);

        var that = this;
        var fadeOut = new me.Tween(this.getReady).to({alpha: 0}, 2000)
            .easing(me.Tween.Easing.Linear.None)
            .onComplete(function() {
                    game.data.start = true;
                    me.game.world.addChild(new PipeGenerator(), 0);
                    me.game.world.removeChild(that.getReady);
             }).start();
    },

    onDestroyEvent: function() {
        me.audio.stopTrack('theme_nyan');
        // free the stored instance
        this.HUD = null;
        this.bird = null;
        this.ground1 = null;
        this.ground2 = null;
        me.input.unbindKey(me.input.KEY.SPACE);
        me.input.unbindPointer(me.input.mouse.LEFT);
    }
});

game.GameOverScreen = me.ScreenObject.extend({
    init: function() {
        this.savedData = null;
        this.handler = null;
    },

    onResetEvent: function() {
        //save section
        this.savedData = {
            score: game.data.score,
            steps: game.data.steps
        };
        me.save.add(this.savedData);

        if (!me.save.topSteps) me.save.add({topSteps: game.data.steps});
        if (game.data.steps > me.save.topSteps) {
            me.save.topSteps = game.data.steps;
            game.data.newHiScore = true;
        }
        me.input.bindKey(me.input.KEY.ENTER, "enter", true);
        me.input.bindKey(me.input.KEY.SPACE, "enter", false)
        me.input.bindPointer(me.input.mouse.LEFT, me.input.KEY.ENTER);

        this.handler = me.event.subscribe(me.event.KEYDOWN,
            function (action, keyCode, edge) {
                if (action === "enter") {
                        me.state.change(me.state.MENU);
                }
            });

        var gImage = me.loader.getImage('gameover');
        me.game.world.addChild(new me.Sprite(
                me.video.renderer.getWidth()/2 - gImage.width/2,
                me.video.renderer.getHeight()/2 - gImage.height/2 - 100,
                gImage
        ), 12);

        var gImageBoard = me.loader.getImage('gameoverbg');
        me.game.world.addChild(new me.Sprite(
            me.video.renderer.getWidth()/2 - gImageBoard.width/2,
            me.video.renderer.getHeight()/2 - gImageBoard.height/2,
            gImageBoard
        ), 10);

        me.game.world.addChild(new BackgroundLayer('bg', 1));

        // ground
        // this.ground1 = me.pool.pull('ground', 0, me.video.renderer.getHeight() - 96);
        // this.ground2 = me.pool.pull('ground', me.video.renderer.getWidth(),
        //                             me.video.renderer.getHeight() - 96);
        // me.game.world.addChild(this.ground1, 11);
        // me.game.world.addChild(this.ground2, 11);

        // share button
        var buttonsHeight = me.video.renderer.getHeight() / 2 + 200;
        this.share = new Share(me.video.renderer.getWidth()/2 - 180, buttonsHeight);
        me.game.world.addChild(this.share, 12);

        //tweet button
        this.tweet = new Tweet(this.share.pos.x + 170, buttonsHeight);
        me.game.world.addChild(this.tweet, 12);

        // add the dialog witht he game information
        if (game.data.newHiScore) {
            var newRect = new me.Sprite(
                    235,
                    355,
                    me.loader.getImage('new')
            );
            me.game.world.addChild(newRect, 12);
        }

        this.dialog = new (me.Renderable.extend({
            // constructor
            init: function() {
                // size does not matter, it's just to avoid having a
                // zero size
                // renderable
                this._super(me.Renderable, 'init', [0, 0, 100, 100]);
                this.font = new me.Font('gamefont', 40, 'black', 'left');
                this.steps = 'Score: ' + game.data.steps.toString();
                this.topSteps= 'High Score: ' + me.save.topSteps.toString();
            },

            draw: function (renderer) {
                var context = renderer.getContext();
                var stepsText = this.font.measureText(context, this.steps);
                var topStepsText = this.font.measureText(context, this.topSteps);
                var scoreText = this.font.measureText(context, this.score);

                //steps
                this.font.draw(
                    context,
                    this.steps,
                    me.game.viewport.width/2 - stepsText.width/2 - 60,
                    me.game.viewport.height/2
                );

                //top score
                this.font.draw(
                    context,
                    this.topSteps,
                    me.game.viewport.width/2 - stepsText.width/2 - 60,
                    me.game.viewport.height/2 + 50
                );
            }
        }));
        me.game.world.addChild(this.dialog, 12);
    },

    onDestroyEvent: function() {
        // unregister the event
        me.event.unsubscribe(this.handler);
        me.input.unbindKey(me.input.KEY.ENTER);
        me.input.unbindKey(me.input.KEY.SPACE);
        me.input.unbindPointer(me.input.mouse.LEFT);
        this.ground1 = null;
        this.ground2 = null;
        this.font = null;
        me.audio.stop("theme_nyan");
    }
});
