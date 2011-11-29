/**
 * jQuery.xrender plugin
 *
 * Copyright (c) 2011 Kazuki Muto, Nobumitsu Nagashima
 * MIT license
 * http://www.opensource.org/licenses/mit-license.php
 *
 */
(function($){
  $.fn.xrender = function(opts) {
    var rendered = 0;
    var total = $(this).length;
    var completeAll = (typeof opts != "undefined" && typeof opts.callback != "undefined")? opts.callback: null;
    $(this).each(function(){
      new $.xrender(this, opts, function(){
       rendered++;
        if (rendered >= total && completeAll != null) {
          completeAll();
        };
      });
    });
  };
})(jQuery);

$.xrender = function(el,opts, callback) {
  var inst = this;
  inst.opts = opts || {};
  inst.debug = false;
  inst.relative = new Array();
  inst.lastXpaths = new Array();
  inst.lastXpathIndex = 0;
  inst.lastXml = null;
  inst.except = new Array();
  var service = $(el).attr("data-xrender-xml");
  if (service == null || service == ""){
	return;
  }
  var isActive = true;
  if ($(el).css("display") == 'none') {
	isActive = false;
  }else{
    $(el).hide();
    var tagName = $(el).get(0).tagName.toLowerCase();
    $(el).after($('<'+tagName +'>loading…</' +tagName +'>').css({
    	'height' : $(el).height(),
    	'width' : $(el).width()
    }));
  }
  var method = $(el).attr("data-xrender-method") != null ? $(el).attr("data-xrender-method") : "GET";
  var completeCallback = $(el).attr("data-xrender-callback"); 
  var params = null;
  if (method == "POST" || method == "post") {
	var paramIndex = service.indexOf('?');
    if (service != undefined && paramIndex != -1) {
      if (service.length > paramIndex+1){
        params = service.substr(paramIndex+1);
        service = service.substr(0, paramIndex);
      }
    }
  }
  $.ajax({
	type: method,
	//url: (service.match(/^http/)? service: "api/"+service),
	url: service,
	data: params,
	success: function(data) {
      inst.restRender(data, el);
      if (isActive) {
 	    $(el).next().remove();
 	    $(el).show();
      }
	  if(completeCallback != null) {
	    eval(completeCallback +"(data, el)");
	  }
	  if(callback != null) {
	    callback(data, el);
	  }

    },
    error: function(){},
	dataType: 'xml'
  });
};

$.xrender.XpathResult = {
  ANY_TYPE:0,
  NUMBER_TYPE:1,
  STRING_TYPE:2,
  BOOLEAN_TYPE:3,
  UNORDERED_NODE_ITERATOR_TYPE:4,
  ORDERED_NODE_ITERATOR_TYPE:5,
  UNORDERED_NODE_SNAPSHOT_TYPE:6,
  ORDERED_NODE_SNAPSHOT_TYPE:7,
  ANY_UNORDERED_NODE_TYPE:8,
  FIRST_ORDERED_NODE_TYPE:9	  
};

$.xrender.evaluate = function(xpath, xml) {
  if (xml == null || $(xml).length == 0) {
	return;
  }
  xml = $(xml)[0];
  var owner = xml.ownerDocument;
  if (owner == null) {
	owner = xml;
    if ($.isFunction(owner.evaluate)) {
      xml = xml.firstChild;
    }else{
      xml = xml.documentElement;
    }
  }
  try {
	var r = null;
	if (xpath.match(/count\(.+\)[^\]]*$|position\(\)[^\]]*$/)) {
		if ($.isFunction(owner.evaluate)) {
			r = owner.evaluate(xpath, xml, null, $.xrender.XpathResult.NUMBER_TYPE, null);
		}else{
			r = document.evaluate(xpath, xml, null, $.xrender.XpathResult.NUMBER_TYPE, null);
		}
      return String(r.numberValue);
	}else{
		if ($.isFunction(owner.evaluate)) {
			r = owner.evaluate(xpath, xml, null, $.xrender.XpathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
		}else{
			r = document.evaluate(xpath, xml, null, $.xrender.XpathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
		}
		var els = [];
		for (var i=0; i<r.snapshotLength; i++) {
			els.push(r.snapshotItem(i));
		}
		return els;
	}
  }
  catch (e) {
    if (typeof window.console != 'undefined'){
	  console.log(e);
	  return null;
    }
  }
};

$.xrender.prototype = {
  //debug : false,
  //relative : new Array(),
  //lastXpaths : new Array(),
  //lastXpathIndex : 0,
  //lastXml : null,
  //except : new Array(),
  evaluate : function(xpath, xml){
	return $.xrender.evaluate(xpath, xml);
  },
  filter : function(el, attrName, node, filterChain, filterIndex) {
    //var tagName = $(el).get(0).tagName.toLowerCase();
    var inst = this;
    var filter = filterChain.length > filterIndex? filterChain[filterIndex] : null;
    var xpathIndex = inst.lastXpathIndex;
    var xpaths = inst.lastXpaths;
    var filters = inst.lastFilters;
    if (filter == 'hideIfEmpty') {
      if ($(node).length == 0) {
    	$(el).hide();
    	$('*[data-xrender-xpath]', el).each(function(){
    		inst.relative.push(this);
    	});
    	return;
      }else{
      	$(el).show();
        inst.filter(el, attrName, node, filterChain, filterIndex+1);
        return;
      }
    } else if (filter == 'removeIfEmpty') {
      if ($(node).length == 0 || $(node).text() == undefined || $(node).text() == '') {
    	if (attrName == null || typeof attrName == "undefined" || attrName == '') {
        	$(el).remove();
    	}else{
        	$(el).remove(attrName);
    	}
    	return;
      }else{
      	$(el).show();
        inst.filter(el, attrName, node, filterChain, filterIndex+1);
        return;
      }
    } else if (filter == 'repeat') {
      if (inst.debug) {
        console.log('filter: repeat');
      }
      var newEl = null;
      if ($(node).length == 0) {
  	    if ($(el).children('[data-xrender-xpath]').length > 0) {
          $(el).children('[data-xrender-xpath]').each(function(){
            if ($(this).children('[data-xrender-xpath]').length > 0) {
              inst.bindXpaths(null, $(this));
              inst.relative.push(this);
            }else{
              $(this).html("");
              inst.relative.push(this);
            }
		  });
  	    }else{
          inst.bindVal(el, attrName, "");
  	    }
        return;
      }
	  $.each(node, function(i){
	    var eachNode = this;
	    if (i == 0) {
		  newEl = $(el);
	    }else{
 		  var lastEl = newEl;
 		  newEl = $(el).clone();
 		  $(lastEl).after($(newEl));
	    }
	    $(newEl).show();
	    if ($(newEl).children().length > 0) {
          if (xpaths.length > xpathIndex) {
            inst.lastXpathIndex = xpathIndex+1;
            inst.lastXml = eachNode;
            inst.lastXpaths = xpaths;
            inst.lastFilters = filters;
            inst.bindNext(newEl, eachNode);
		  }
	      $('*[data-xrender-xpath]', $(newEl)).show();
		  inst.bindXpaths(eachNode, $(newEl));
		  $('*[data-xrender-xpath]', $(newEl)).each(function(j){
            inst.relative.push(this);
		  });
	    }
	    else{
	      //inst.bindVal(newEl, attrName, eachNode);
          inst.lastXpathIndex = xpathIndex+1;
          inst.lastXml = eachNode;
    	  //inst.lastXml.isRoot = false;
          inst.bindNext(newEl, inst.lastXml);
	    }
	  });
	  return;
    }
    else if (filter != null){
        if (inst.debug) {
          console.log('filter: '+filter);
        }
    	try {
    		if (filter.match(/^join\('([^']+)'\)/)) {
      		  var delim = RegExp.$1;
              var vals = [];
              $(node).each(function(){
              	vals.push($(this).text());
              });
              inst.bindVal(el, attrName, vals.join(delim));
      		}
    		else if (filter.match(/^prefix\('([^']+)'\)/)) {
        	  var prefix = RegExp.$1;
              var val = filterIndex == 0? inst.htmlentities(inst.getText(node)) : inst.getVal(el, attrName);
              if (typeof val === "undefined" || val == ''){
            	val = '';
                inst.bindVal(el, attrName, val);
              }else{
                inst.bindVal(el, attrName, prefix+val);
              }
        	}
    		else if (filter.match(/^sufix\('([^']+)'\)/)) {
              var sufix = RegExp.$1;
              var val = (filterIndex == 0)? inst.htmlentities(inst.getText(node)) : inst.getVal(el, attrName);
              if (typeof val == "undefined" || val == ''){
              	val = '';
                inst.bindVal(el, attrName, val);
              }else{
                inst.bindVal(el, attrName, val+sufix);
              }
        	}
    		else if (filter.match(/^([^(]+)\(\)/)) {
    			var val = '';
                var func = RegExp.$1;
    			if ($(node).children().length > 0) {
                  val = filterIndex == 0? $(node) : inst.getVal(el, attrName);
    			}else{
                  val = filterIndex == 0? inst.htmlentities(inst.getText(node)) : inst.getVal(el, attrName);
    			}
                var res = false;
                if (val != '') {
                  if (func in window) {
                      res = eval(func +'(val)');
                  } else if (func in String.prototype) {
                	  res = eval("val." +func +'()');
                  }
                }
                if (res != false) {
                  val = res;
                  inst.bindVal(el, attrName, val);
                }
      		}    		
    		else if (filter.match(/^([^(]+)\(([^)]+)\)/)) {
              var func = RegExp.$1;
              var arg = RegExp.$2;
              var val = '';
			  if ($(node).length > 0 && $(node).children().length > 0) {
                val = filterIndex == 0? $(node) : inst.getVal(el, attrName);
			  }else{
                val = filterIndex == 0? inst.htmlentities(inst.getText(node)) : inst.getVal(el, attrName);
			  }
              //予約語
              arg = arg.replace('selector', 'el');
              //予約語
              arg = arg.replace('node', 'node');
              
              var res = false;
              if (val != '') {
                if (func in window) {
            	  res = eval(func +'(val,' +arg +')');
                } else if (func in String.prototype) {
                  res = eval("val." +func +'(' +arg +')');
                }
              }
              if (res != false) {
                  val = res;
                  inst.bindVal(el, attrName, val);
                }
    		}
            inst.filter(el, attrName, node, filterChain, filterIndex+1);
    		//console.log(eval('node.' +filter));
    	}
    	catch (e) {

    		if (typeof window.console != 'undefined'){
    			console.log(e);
		}
    	}
    }else{
      if (filterChain.length == 0 || filterChain[filterIndex-1] == 'hideIfEmpty' || filterChain[filterIndex-1] == 'removeIfEmpty') {
    	  if ($(node).children().length > 0 && $('*[data-xrender-xpath]', $(el)).length > 0) {
          	inst.bindXpaths(node, el);
          	$('*[data-xrender-xpath]', $(el)).each(function(){
      	      inst.relative.push(this);
      	    });
      	    return;
      	  }
    	  if (typeof node == 'object') {
      	    inst.bindVal(el, attrName, inst.htmlentities(inst.getText(node)));
    	  }else{
      	    inst.bindVal(el, attrName, inst.htmlentities(node));
    	  }
      }
      inst.lastXpathIndex = xpathIndex+1;
      //inst.lastXpathIndex++;
      inst.bindNext(el, inst.lastXml);
    }
  },
  getText : function(node) {
	  try {
		  //属性
		  if (node == undefined || $(node).length < 1) {
			  return '';
		  }else if (node[0].nodeType == 2) {
			  return node[0].nodeValue;
		  }else{
			  return $(node).text();
		  }
	  }catch (e) {
		if (typeof window.console != 'undefined'){
		  console.log(e);
		}
	  }
  },
  htmlentities : function(str) {
	if (typeof str == "undefined" || str == '') {
		return '';
	}
	//return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
	return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  },
  htmlentities_decode : function(str) {
	if (typeof str == "undefined" || str == '') {
		return str;
	}
	//return str.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,"\"").replace(/&#039;/g,"'").replace(/&amp;/g,"&");
	return str.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
  },
  getVal : function(el, attrName) {
	var tagName = $(el).get(0).tagName.toLowerCase();
    if(attrName != null) {
      return $(el).attr(attrName);
    }else if(tagName == "input" || tagName == "select") {
      return $(el).val();
    }else{
      return $(el).text();
    }
  },
  bindVal : function(el, attrName, val) {
	var inst = this;
	if (val == undefined || val == null) {
	  val = '';
	}
	if (this.debug) {
      console.log('---val---');
      console.log(val);
	}
	var tagName = $(el).get(0).tagName.toLowerCase();
    if(attrName != null) {
      $(el).attr(attrName, val);
    }
    else if(tagName == "input" || tagName == "select" || tagName == "textarea") {
      $(el).val(inst.htmlentities_decode(val));
      //$(el).val(val);
    }else{
      if (val == '') {
    	if ($(el).children().length > 0) {
    	  //$(el).hide();
    	}else{
          $(el).html(val);
    	}
      }else{
        $(el).show().html(val);
      }
    }
  },
  bindNext : function(el, xml) {
    var inst = this;
    if (inst.lastXpaths.length <= inst.lastXpathIndex) {
      return;
    }
    var filterChain = inst.lastFilters.length > inst.lastXpathIndex? inst.lastFilters[inst.lastXpathIndex].split("|") : [];
    var xpath = inst.lastXpaths[inst.lastXpathIndex];
	if(xpath.indexOf("@") == 0) {
	  var attrName = xpath.split(":")[0].substring(1);
	  xpath = xpath.split(":")[1];
	  var node = inst.evaluate(xpath, xml);
      if (inst.debug) {
        console.log('---xpath---');
        console.log(xpath);
        console.log(node);
      }
	  inst.filter(el, attrName, node, filterChain, 0);
	}else{
	  var node = inst.evaluate(xpath, xml);
      if (inst.debug) {
        console.log('---xpath---');
        console.log(xpath);
        console.log(node);
      }
	  inst.filter(el, null, node, filterChain, 0);
    }
  },
  bindXpaths : function(xml, parent) {
    if (this.debug) {
      console.log('---xml---');
      console.log(xml);
    }
	var xpathEls = $('*[data-xrender-xpath]', $(parent));
//	if ($(parent).is('[data-xrender-xpath]')){
	//	$(xpathEls).add(parent);
	//}
	var inst = this;
	xpathEls.each(function(){
	  var xpathEl = this;
	  if ($.inArray(xpathEl, inst.relative) != -1 || $.inArray(xpathEl, inst.except) != -1) {
          if (inst.debug){
          	console.log("skip element.");
        	console.log(inst.relative);
          	console.log(xpathEl);
            }
		  //continue
		  return true;
	  }
	  var xpath = $(this).attr("data-xrender-xpath");
	  var filter = $(this).attr("data-xrender-filter");
	  var filters = new Array();
	  if (filter != null) {
        filters = filter.split(",");
        var fLen = filters.length;
        for (var i = 0; i < fLen; i++) {
    	  while (filters[i].match(/\(/) && !filters[i].match(/\)/)) {
              filters[i] += ',' + filters[i+1];
              filters.splice(i+1,1);
              fLen--;
              if (fLen <= 0) {
            	break;
              }
    	  }
        }
	  }
 	  var xpaths = xpath.split(",");
 	  if ($.inArray('repeat', filters) != -1){
        //except duplication
 		if ($(xpathEl).prev('[data-xrender-xpath='+xpath +']').length > 0){
 		  $('*[data-xrender-xpath]', $(xpathEl)).each(function(){
        	inst.except.push(this);
          });
          $(xpathEl).remove();
          if (inst.debug){
        	console.log("remove duplicate element.");
        	console.log(xpathEl);
          }
          return true;
 		}
	  }
      inst.lastFilters = filters;
 	  inst.lastXpaths = xpaths;
 	  inst.lastXml = xml;
      inst.lastXpathIndex = 0;
	  inst.bindNext(xpathEl, xml);
    });
  },
  restRender : function(xml, parent) {
	var inst = this;
	//except data-xrender-xml in data-xrender-xml	
	$('*[data-xrender-xml]', parent).each(function(){
		$('*[data-xrender-xpath]', this).each(function(){
			inst.except.push(this);
		});
	});
	
	//xml.isRoot = true;
	this.bindXpaths(xml, parent);
  }
};

$(function(){
  $('*[data-xrender-xml]').xrender();
});

function restService(targetNodeList) {
  $(targetNodeList).xrender();
}
