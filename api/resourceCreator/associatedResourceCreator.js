var express = require('express');
var helpers = require('./helpers');
var queryCreator = require('../actions/queryCreator');
var Actions = require('../actions/associatedActions.js')

var associatedResourceCreator = (function(){

  let executeHooks = (actions,req,res,options)=>{
    let actionsArray = [];

    if (actions.start) actionsArray.push(actions.start);
    if (actions.parent) actionsArray.push(actions.parent);
    if (actions.build)  actionsArray.push(actions.build);
    if (actions.before) actionsArray.push(actions.before);
    if (actions.data) actionsArray.push(actions.data);
    if (actions.action) actionsArray.push(actions.action);
    if (actions.sent) actionsArray.push(actions.sent);

    actionsArray = actionsArray.reverse();
    let context = {parentResource:options.parentResource,model:options.model,query:{},options:options};
    let chain =  helpers.createMiddleware(actionsArray[0],req,res,context,function(){/*done*/});
    for (let i=1;i<actionsArray.length;i++){
     chain = helpers.createMiddleware(actionsArray[i],req,res,context,chain);
    }
    return chain;
  }

  let createResource = (options)=>{
    var resource = {
      parentResource:options.parentResource,
      create:Actions.buildCreate(),
      list:Actions.buildList(),
      read:Actions.buildRead(),
      set:Actions.buildSet(),
      delete:Actions.buildDelete(),
      router:null,
      endpoint:options.endpoint,
      options:queryCreator.normalizeOptions(options),
    };
    resource.router = createRouter(resource);
    resource.parentResource.router.use(
      helpers.createNestedRoute(resource.parentResource.options.paramName,resource.endpoint),
      resource.router);

    return resource;
  }

  let createRouter = (resource)=>{

    let router = express.Router({ mergeParams:true});
    router.get('/',function(req,res){
      executeHooks(resource.list,req,res,resource.options)();
    });

    router.get('/:'+resource.options.paramName,function(req,res){
      executeHooks(resource.read,req,res,resource.options)();
    });
    router.post('/set',function(req,res){
      executeHooks(resource.set,req,res,resource.options)();
    });
    router.post('/',function(req,res){
      executeHooks(resource.create,req,res,resource.options)();
    });
    router.delete('/:'+resource.options.paramName,function(req,res){
      executeHooks(resource.delete,req,res,resource.options)();
    });

    return router;
  }

  return {
    createResource:createResource,
	};

})();
module.exports = associatedResourceCreator;
