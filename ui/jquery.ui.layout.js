;(function($){

  var toCamelCase = function(string){
    string = $.trim(string.toLowerCase()).replace(/\s\s/,' ')
    var words = string.split(" ")
    for(var i=1;i<words.length; i++){
      words[i] = words[i].charAt(0).toUpperCase() + words[i].substring(1)
    }
    string = words.join("")
    return string
  };

  // quick hack of ui.resizable in order to make the div icon added to the native handler to be accepted as so
  $.extend($.ui.resizable.prototype, {
    _mouseCapture: function(event) {
      var handle = false;
      for (var i in this.handles) {
        if ($(this.handles[i])[0] == event.target || $(this.handles[i]).children()[0] == event.target) {
          handle = true;
        }
      }

      return !this.options.disabled && handle;
    }
  });

  $.widget('ui.layout', {
    options: {
      type: "horizontal", // vertical
      defaults: {
        closingWidth: 20,
        closingHeight: 20,
        hiding: false,
        sliding: false,
        toggleEvent: 'click',
        toggleSelector: '.ui-resizable-handle'
      },
      east: {
        selector: '.ui-layout-pane-east',
        width: 200,
        opened: true,
        resizable: { handles: 'w', maxWidth: 999999 }

      },
      west: {
        selector: '.ui-layout-pane-west',
        width: 200,
        opened: true,
        resizable: { handles: 'e', maxWidth: 999999 }
      },
      center: {
        selector: '.ui-layout-pane-center',
        minWidth: 0,
        minHeight: 0
      },
      north: {
        selector: '.ui-layout-pane-north',
        height: 50,
        opened: true,
        resizable: { handles: 's', maxHeight: 999999 }
      },
      south: {
        selector: '.ui-layout-pane-south',
        height: 50,
        opened: true,
        resizable: { handles: 'n', maxHeight: 999999 }
      }
    },
//  todo : method to be used in order to slide a pane on opening an closing action (instead of resizing it)
    _positionProp: function(pane){
      var prop ;
      switch(pane){
        case 'west': prop = 'left'; break;
        case 'east': prop = 'right'; break;
        case 'north': prop = 'top'; break;
        case 'bottom': prop = 'bottom'; break;
      }
      return prop
    },
    _sizeProp: function(prefix){
      prefix = prefix || '';
      return toCamelCase(prefix +" " + (this.options.type == 'horizontal' ? 'width' : 'height' ));
    },

    _create: function(){
      var self = this;

      this.panes = {};

      this.element.addClass('ui-widget ui-layout');

      var paneList = this.options.type == 'horizontal' ? ['east', 'center', 'west'] : ['north', 'center', 'south']

      $.each(paneList, function(i, pane){
        // report defaults options as defaults pane options
        self.options[pane] = $.extend(true, {}, self.options.defaults, self.options[pane]);

        var $pane = self.element.children(self.options[pane].selector)

        if ($pane.length){

          $pane.addClass('ui-corner-all ui-widget-content ui-layout-pane ui-layout-pane-'+pane);

          // init side panes as resizable elements
          if (pane != 'center'){


            // init pane as rezisable element
            $pane.resizable($.extend({}, self.options[pane].resizable,{
              containment: 'parent'
            }));

            $pane.bind('resizestart', function(e,ui){
              self._open(pane)

              // set max width/height dynamically
              $pane.resizable('option', self._sizeProp('max'), self._maxSize(pane));
              if ($pane.find('iframe').length){
                var $mask = $('<div class="iframe-mask"/>')
                $mask
                  .css({
                    opacity: 0.0001,
                    background: 'white',
                    width: $pane.width(),
                    height: $pane.height(),
                    zIndex: $pane.zIndex() + 1,
                    position: 'absolute'
                  })
                  .appendTo($pane)
                  .position({at:'left top', my: 'left top', of: $pane})
              }
            });
            $pane.bind('resize', function(e){
              $('>div.iframe-mask', $pane)
                .width($pane.width())
                .height($pane.height())
                .position({at:'left top', my: 'left top', of: $pane})
            });
            $pane.bind('resize resizestop', function(e){
              // resize central pane if not sliding
              if (!self.options[pane].sliding)
                self.resize();
            });

            var preventToggling = false;

            $pane.bind('resizestop', function(e,ui){

              // remove conflicting attributes
              self._removeInlineStyleAttr(pane);

              // remove potential iframe mask
              $pane.children('div.iframe-mask').remove();


              // prevent the pane to toggle after a mouseup event, if the orginal size has significantly been changed
              if (Math.abs(ui.size[self._sizeProp()] - ui.originalSize[self._sizeProp()]) > 3){
                preventToggling = true;
                setTimeout(function(){
                  preventToggling = false;
                },100);
              }
              else{
                return true;
              }


              // close the sidePane if not visible anymore, otherwise record its dimension
              if (ui.size[self._sizeProp()] < self.options[pane][self._sizeProp('closing')]){
                self.close(pane)
              }
              else {
                self._opened(pane);
                self.options[pane][self._sizeProp()] = ui.size[self._sizeProp()]
              }

            });

            // toggle the pane if clicking on the handler 
            $pane.data('resizable')._handles
                .append('<div class="ui-icon ui-icon-grip-dotted-'+ (self.options.type == 'horizontal' ? 'vertical' : 'horizontal') +'"></div>')

             $(self.options[pane].toggleSelector, $pane)
                .bind(self.options[pane].toggleEvent, function(e){
                    if (!preventToggling)
                      self.toggle(pane);
                })
          }

          self.panes[pane] = $pane ;


          self._hiding(pane) ;
          
          // set pane dimension
          if(self.options[pane].sliding){
            self._sliding(pane)
            $pane[self._sizeProp()](0);
            self._closed(pane);

          }
          else if (self.options[pane].opened){
            self._open(pane, false);
            $pane[self._sizeProp('outer')](self.options[pane][self._sizeProp()], true)
          }
                      
        }
      });

      if (this.element.hasClass('ui-layout-pane')){
        this.element.bind('resize',function(e){
          if (e.target == self.element[0]){
            self.resizeElement();
          }
        })
      }
      else {
        $(window).bind('resize', function(e){
          self.resizeElement();
        })
      }

      this.resizeElement();

    },

    resizeElement: function(){
      var self = this;

      if (this.element[0].tagName == "BODY"){
        self.element
            .css({padding: '0', margin: '0'})
            .outerWidth($(window).width(), true)
            .outerHeight($(window).height(), true);
      } else if(!self.element.hasClass('ui-layout-pane')) {
        self.element
            .outerHeight(self.element.parent().innerHeight(), true)
            .outerWidth(self.element.parent().innerWidth(), true);
      } 

      self._panes().each(function() {
        if (self.options.type == 'horizontal')
          $(this).outerHeight(self.element.innerHeight(), true)
        else
          $(this).outerWidth(self.element.innerWidth(), true)
      });

      // resize center pane
      self.resize();

      return this;
    },
    resize: function(){
      var self = this,
          $pane = this.panes['center'],
          $prev = $pane.prev('.ui-layout-pane');

      var sum = 0;
      this.element.children(".ui-layout-pane").not('.ui-layout-pane-center').each(function(){
        if ($(this).hasClass('ui-layout-pane-sliding')){
          sum+= $(this)[self._sizeProp('outer')](true) - $(this)[self._sizeProp('inner')]()
        }
        else{
          sum+= $(this)[self._sizeProp('outer')](true);
        }
      });

      $pane[self._sizeProp('outer')](this.element[self._sizeProp('inner')]() - sum, true );

      var offset = function(){
        return self.options.type == 'horizontal' ? $prev.css('marginRight')+' 0' : '0 ' + $prev.css('marginBottom')
      }

      if ($prev.length && !$prev.hasClass('ui-layout-pane-sliding')){
        $pane.position({
          offset: offset(),
          of: $prev,
          my: 'left top',
          at: this.options.type == 'horizontal' ? 'right top' : 'left bottom',
          collision: "none"
        })
      }
      else{
        $pane.position({
          offset: $prev.hasClass('ui-layout-pane-sliding') ? offset() : '0 0',
          of: this.element,
          my: 'left top',
          at: 'left top',
          collision: "none"
        })
      }

      this._trigger('resize')
      // emulate a resize event from the center pane
      $pane.trigger('resize');

      return this
    },
    _putForeground:function(pane){
      var $pane = this.panes[pane],
          depth = this.element.parents('.ui-layout').length
      this.options[pane].zIndex = $pane.zIndex();
      $pane.zIndex(this.element.zIndex() + 10 - depth)
    },
    _sliding: function(pane){
      this.panes[pane][this.options[pane].sliding ? 'addClass' : 'removeClass']('ui-layout-pane-sliding');
      if (this.options[pane].sliding)
        this._putForeground(pane);
    },
    _hiding: function(pane){
      this.panes[pane][this.options[pane].hiding ? 'addClass' : 'removeClass']('ui-layout-pane-hiding');
    },
    option: function( pane, key, value ) {
      if ($.inArray(pane, ['center', 'north', 'south', 'east', 'west'])){
        this.options[pane][key] = value;
        switch(key){
          case 'hiding':
            this._hiding(pane);
            this.resize();
            break;
          case 'sliding':
            this._sliding(pane);
            this.resize();
            break;
        }
      }
      else{
        this._super('option', pane, key)
      }
      return this;
	  },

    _ui:function(pane){
      return {pane: this.panes[pane], paneName: pane, options: this.options}
    },
    _open: function(pane, trigg){
      trigg = ("undefined" == typeof trigg ) ? true : trigg;
      this.panes[pane].addClass('ui-layout-pane-open')
      this.panes[pane].removeClass('ui-layout-pane-close')
      this.options[pane].opened = true;
      if (trigg)
        this._trigger(pane+'open', null, this._ui(pane));
    },
    _opened: function(pane){
      this._trigger(pane+'opened', null, this._ui(pane));
    },
    _close: function(pane){
      this._trigger(pane+'close', null, this._ui(pane));
    },
    _closed: function(pane){
      this.panes[pane].removeClass('ui-layout-pane-open')
      this.panes[pane].addClass('ui-layout-pane-close')
      this.options[pane].opened = false;
      this._trigger(pane+'closed', null, this._ui(pane));
    },


    _panes: function(){
      return this.element.children('.ui-layout-pane')
    },

    _maxSize:function(pane){
      var options = this.options[pane],
          $pane = this.panes[pane],
          property = this._sizeProp()

      return Math.min(options.resizable[this._sizeProp('max')], this.element[this._sizeProp('inner')]() - ( this.options['center'].minWidth + this._panes().not($pane).not(this.panes['center'])[this._sizeProp('outer')](true) ))
    },

    _removeInlineStyleAttr: function(pane){
      var $pane = this.panes[pane],
          style = this.panes[pane].attr('style'),
          props ;

      switch(pane){
        case 'east': props = 'left'; break;
        case 'south': props = 'top'; break;
      }
      if (props){
        $.each(props.split(','), function(i,r){
          style=style.replace(new RegExp(r+':\\s\\w*\;',''));
        });
        $pane.attr('style', style);
      }
    },

    toggle: function(pane, callback){
      if (this.options[pane].opened)
        this.close(pane, callback);
      else
        this.open(pane, callback)

      return this.element
    },
    close: function(pane, callback){
      var self = this,
          css = {},
          callback = callback || null ;
      if (this.options[pane].opened){
        this._close(pane)
        css[self._sizeProp()] = 0;
        this._animate(pane, css, function(){
          self._closed(pane);
          if (callback)
            callback.apply(self.panes[pane])
        })
      }
      return this.element
    },
    open: function(pane, callback){
      var self = this,
          callback = callback || null,
          css = {} ;
      if (!this.options[pane].opened){
        this._open(pane)
        css[self._sizeProp()] = Math.min(this.options[pane][this._sizeProp()], this._maxSize(pane)) ;
        this._animate(pane, css, function(){
          self._opened(pane)
          if (callback)
            callback.apply(self.panes[pane])
        })
      }
      return this.element
    },
    _animate: function(pane, css, callback){
      var self = this,
          callback = callback || null ;

      //self._putForeground(pane);

      this.panes[pane].animate(css, {
        step: function(currentStep){
          if (!self.options[pane].sliding)
            self.resize();
        },
        complete: function(){
          if (callback){
            callback();
          }
          if (!self.options[pane].sliding){
            //self._putBackground(pane)
            self.resize();
          }
        }}
      );
    }

  });
})(jQuery)