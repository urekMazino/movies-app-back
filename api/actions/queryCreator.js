let path = require('path');
let helpers = require('./helpers');

let resourceCreator = (function(){

  let buildQSearch = (attributes,value)=>{
    let qCondition= {$or:[]};
    attributes.forEach((attr)=>{
      let attributeLike = {}
      attributeLike[attr]={}
      attributeLike[attr].$like='%'+value+'%';
      qCondition.$or.push(attributeLike);
    });
    return qCondition;
  };
  let findSearchOption = (key,searchOptions)=>{
    if (searchOptions){
      for (let i=0;i<searchOptions.length;i++){
        if (key==searchOptions[i].param){
          return searchOptions[i];
        }
      }
    }
    return null;
  };

  let appendSearchOption = (where,options,value)=>{
    let attributes = options.attributes||[];
    let operator = options.operator|| (Array.isArray(value))?'$in':'$eq';
    attributes.forEach((attr)=>{
      let obj = {}
      obj[attr]={}
      obj[attr][operator]=value;
      where.$and.push(obj);
    });
  };

  let getAttributesArray = (model)=>{
    let arr =[];
    Object.keys(model.rawAttributes).forEach((key)=>{
      arr.push(key);
    })
    return arr;
  };

  let normalizeOptions = (options)=>{
    let newOptions={...options};
    newOptions.attributes = newOptions.attributes || getAttributesArray(newOptions.model);
    if (newOptions.excludeAttributes){
      newOptions.excludeAttributes.forEach((attr)=>{
        let index = newOptions.attributes.indexOf(attr)
        if (index>=0){
          newOptions.attributes.splice(index,1);
        }
      })
    }
    helpers.getPK(newOptions.model)
    .then(PK=>{
      newOptions.primaryKey = PK;
    })
    newOptions.paramName = newOptions.model.name+"Id";
    newOptions.order=((newOptions.order)?getOrderingArray(newOptions.order):undefined);
    return newOptions;
  };

  let getOrderingArray = (arrParams)=>{
    return arrParams.map((param)=>{
      if (param.charAt(0)=="-"){
        return [param.substring(1,param.length), 'DESC'];
      }
      return [param,'ASC'];
    });
  };

  let makeArray = (variable)=>{
    return ((variable)?((Array.isArray(variable))?variable:[variable]):[]);
  };

  let initQuery = (options)=>{
    let obj ={
      attributes: options.attributes,
      order:options.order,
      where:{
        $and:[]
      },
    }
    obj = JSON.parse(JSON.stringify(obj));
    obj.include=makeArray(options.include);
    return obj;
  };

  let endpointById = (endpoint)=>{
    return path.normalize(endpoint)+":id"
  };

  let fabricateQuery = (req,options)=>{

    let query = initQuery(options);
    let page,count,scope,model=options.model;
    Object.keys(req.query).forEach(function(key,index) {
      let value =req.query[key];
      switch(key){
        case 'q':
          query.where.$and.push(buildQSearch(options.attributes,value));
          return;
        break;
        case 'order':
          query.order = getOrderingArray(value);
          return;
        break;
        case 'page':
          page=parseInt(value);
          return;
        break;
        case 'count':
          count=parseInt(value);
          return;
        break;
        case 'scope':
          scope=value;
          return;
        break;
      }
      let searchOption = findSearchOption(key,options.search);
      if (searchOption){
        appendSearchOption(query.where,searchOption,value);
      }
    });
    if (page!=null){
      count = count||50;
      query.offset = page*count;
      query.limit = count;
    }
    if (scope){
      model = model.scope(scope);
    }
    return {query:query,model:model};
  };

  let fabricateEmptyQuery = ()=>{
    return {
      where:{}
    };
  }

  return {
    fabricateQuery:fabricateQuery,
    fabricateEmptyQuery:fabricateEmptyQuery,
    normalizeOptions:normalizeOptions,
	};

})();
module.exports = resourceCreator;
