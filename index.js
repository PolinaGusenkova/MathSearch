var Application = new (function ()
  {
  var self = this

  this.bottomDateFltr = '0';
  this.roofDateFltr = '3000';
  this.authorFltr = '';
  this.journalFltr = '';

  this.config =
    {
    endpointURL: ko.observable ("http://lobachevskii-dml.ru:8890/sparql"),
    useMathJax:  ko.observable (true),
    limit:       ko.observable (25)
    }

  this.status = ko.observable("loading"); //loading, ready, result, loadingmore, error

  this.concepts = ko.observableArray([]);

  this.conceptURI = null;

  this.query =
    {
    conceptURI:  ko.observable(""),
    offset: ko.observable(0),
    isAllLoaded: ko.observable(false),
    isUnrelated: ko.observable(false), //галочка unrelated
    isAscending: ko.observable(false) //порядок сортировки
  }

  this.instances = ko.observableArray();

  this.segmentTypes =
    [
    new SegmentType ("Axiom"),
    new SegmentType ("Claim"),
    new SegmentType ("Conjecture"),
    new SegmentType ("Corollary"),
    new SegmentType ("Definition"),
    new SegmentType ("Equation"),
    new SegmentType ("Example"),
    new SegmentType ("Lemma"),
    new SegmentType ("Proof"),
    new SegmentType ("Proposition"),
    new SegmentType ("Remark"),
    new SegmentType ("Theorem"),
    new SegmentType ("DocumentSegment", "Other")
    ]
  this.segmentTypes.forEach (function (objSegmentType)
    {
    self.segmentTypes [objSegmentType.uri] = objSegmentType;
    })

  this.loadingIndicator =
    {
    loading: ko.computed(function()
      {
      return (self.status () == "loading" || self.status () == "loadingmore");
      })
    }

  this.results =
    {
    visible: ko.computed(function()
      {
      return (self.status () == "result" || self.status () == "loadingmore");
      })
    }

  this.errorMessage =
    {
    visible: ko.computed(function()
      {
      return (self.status () == "error");
      }),
    text: ko.observable("")
    }

  this.emptyQueryMessage =
    {
    visible: ko.observable(false)
    }

  this.instancesFiltred = ko.computed(function()
    {
    return self.instances().filter (function (objInstance)
      {
      return (objInstance.isVisible ());
      });
    })

  this.instancesFiltred.count = ko.computed(function()
    {
    return (self.instancesFiltred().length);
    })

  this.Details;


  var hshConcepts = [];
  this.init = function ()
    {
    this.get
      (
      //"DEFINE input:inference 'ivm'"+
      "SELECT ?concept, ?label, ?dbpedianame "+
      "WHERE"+
      "  {"+
      "    {"+
      "    ?concept rdfs:subClassOf <http://cll.niimm.ksu.ru/ontologies/mathematics#E34> option (transitive)."+
      "    ?concept rdfs:label ?label."+
      //"    FILTER (lang(?label) = 'en')"+
      "    }"+
      "  UNION"+
      "    {"+
      "    ?concept skos:closeMatch ?dbpedianame."+
      "    }"+
      "  }"
      )
    .then (function (objResult)
      {
        var str='';
        var arConcepts = [];
      objResult.results.bindings.forEach (function (objBinding)
        {
        var strConceptURI = objBinding.concept.value;
        var strKey;
          if (objBinding.dbpedianame) strKey = objBinding.dbpedianame.value;
          if (objBinding.label)       strKey = objBinding.label.value;
        if (!hshConcepts [strKey])
          {
          str += '<option value="'+strKey+'" />';
          arConcepts [arConcepts.length] = strKey;
          hshConcepts [strKey] = strConceptURI;
          }
        })
          self.concepts(arConcepts);
          var search_list=document.getElementById("concept-list");
          search_list.innerHTML = str;
          console.log(self.query.isUnrelated);
      self.status ("ready");

      })
    ["catch"] (function (e)
      {
      console.log (e);
      self.errorMessage.text (e.message || e.responseText || "");
      self.status ("error");
      })
    }

  this.searchNew = function (strConceptURI)
    {
    var str = $('input.flexdatalist').val().split(',');
    for (var i = 0; i < str.length; i++) {
        str[i] = str[i].charAt(0).toUpperCase() + str[i].substr(1);
    }
    var strConceptURI = str || strConceptURI;

    if (strConceptURI[0] == "")
      {
      self.emptyQueryMessage.visible (true);
      return;
      }

    self.conceptURI = strConceptURI;

    if (self.status () == "loading") return;

    self.status ("loading");

    self.query.offset (0);

    this.search (strConceptURI, 0).then (function (arInstances)
      {
        self.instances(arInstances);
/*
          arInstances.forEach (function (objInstance)
          {
              self.instances.push (objInstance);
          });
*/
      self.status ("result");
      })
    ["catch"] (function (e)
      {
      console.log (e);
      self.errorMessage.text (e.message || e.responseText || "");
      self.status ("error");
      })

    }

  /*this.searchMore = function ()
    {
    var strConceptURI = self.query.conceptURI ();
    var intOffset = self.query.offset ();

    self.status ("loadingmore");

    this.search (strConceptURI, intOffset).then (function (arInstances)
      {
      arInstances.forEach (function (objInstance)
        {
        self.instances.push (objInstance);
        });

      self.status ("result");
      })
    ["catch"] (function (e)
      {
      self.errorMessage.text (e.message || e.responseText || "");
      self.status ("error");
      })
    }
*/
  this.search = function (strConceptURI, intOffset)
    {
    self.query.conceptURI (strConceptURI.toString().replace(',', ', '));
    var len = self.conceptURI.length;
          //"define input:inference 'ontomath'"+
          var query = "PREFIX moc: <http://cll.niimm.ksu.ru/ontologies/mocassin#> " +
              "PREFIX akt: <http://www.aktors.org/ontology/portal#> "+
              "SELECT DISTINCT ?entity ?formula ?year " +
                    "(sql:GROUP_CONCAT(?segmentType, \" \") AS ?segments) ?formulaLatexSource ";
        for (var i = 0; i < len; i++) {
          query += "?notationLatexSource"+i+" ";
        }
        query += "WHERE { " +
            "{ " +
            "SELECT DISTINCT ?entity ?formula ?year ?segmentType ?formulaLatexSource ";
        for (var i = 0; i < len; i++) {
            query += "?notationLatexSource"+i+" ";
        }
        query += "WHERE  { " +
            " ?article moc:hasSegment ?segment; rdf:type akt:Article-Reference; akt:included-in-publication ?journal; akt:has-author ?author." +
            "?journal akt:has-date ?year. " +
            " ?segment rdf:type ?segmentType;     moc:mentions ?entity.     " +
            "       ?entity moc:hasNotation ?formula.    " +
            "       ?formula a moc:Formula; ";
        for (var i = 0; i < len; i++) {
            query += "moc:hasPart ?notation"+i+"; ";
        }
        query += "moc:hasLatexSource ?formulaLatexSource. ";
        for (var i = 0; i < len; i++) {
            query += "?entity"+i+" a ?class"+i+";    moc:hasNotation ?notation"+i+". " +
                "           ?notation"+i+" a moc:Variable; moc:hasLatexSource ?notationLatexSource"+i+". ";
        }
        for (var i = 0; i < len; i++) {
            query += "FILTER (";
            for (var j = 0; j < len; j++) {
              if (j < len-1)
                query += " str (?class"+i+") = '" + hshConcepts [self.conceptURI[j]] + "' ||";
              else
                query += " str (?class"+i+") = '" + hshConcepts [self.conceptURI[j]] + "'  ) ";
            }
        }
        query += "FILTER ( str(?segmentType) != 'http://salt.semanticauthoring.org/ontologies/sdo#Section') " +
                " } " +
            "} " +
            "} GROUP BY ?formula ?entity ?formulaLatexSource ?year ";
        for (var i = 0; i < len; i++) {
            query += "?notationLatexSource"+i+" ";
        }
        query += "ORDER BY DESC (?year)";

          //"LIMIT "+ Application.config.limit() +" "+
          //"OFFSET "+ intOffset +" ";
          query.replace(/\s+/g, " "); //"Angle" query fix
        console.log(query);
        console.time("q");
    return this.get(query)
    .then (function (objResult)
    {
      console.timeEnd("q");
        var arInstances = objResult.results.bindings.map (function (objBinding)
        {
        var objInstance = new Instance ();
          for (var i = 0; i < len; i++) {
              objInstance.entityURI = objBinding.entity.value;
              objInstance.formula.uri = objBinding.formula.value;
              objInstance.formula.latexSource = objBinding.formulaLatexSource.value;
              objInstance.segmentList.segments = objBinding.segments.value;
              objInstance.notation.latexSource = objBinding.notationLatexSource0.value;
              objInstance.date = objBinding.year.value.match (/[0-9]+/)[0];
          }
        return (objInstance);
        })

      //self.query.offset (intOffset + arInstances.length);
      //self.query.isAllLoaded (arInstances.length < Application.config.limit());

      return (arInstances);
      })
    }

  this.mj = function (elem)
    {
    if (Application.config.useMathJax()) MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
    }

  this.get = function (strSPARQL)
    {
    var objSparqler = new SPARQL.Service(self.config.endpointURL());
    return new Promise(function (fncResolve, fncReject)
      {
      objSparqler.createQuery().query (strSPARQL,
        {
        success: function (objResult){fncResolve (objResult);},
        failure: function (erError) {fncReject (erError);}
        });
      })
    }
  })()

function SegmentType (strURI, strName)
  {
  var st = this;
  
  this.uri       = "http://cll.niimm.ksu.ru/ontologies/mocassin#" + strURI;
  this.name      = strName || strURI;
  this.isChecked = ko.observable(true);

  this.count = ko.computed(function()
  {
      return Application.instances().filter (function (objInstance)
      {
        objInstance.segmentList.createArr();
          return (objInstance.segmentList.segmentArr.indexOf(st) > -1)
      }).length;
  }, st, {deferEvaluation: true})
  /*this.count = ko.computed(function()
    {
    return Application.instances().filter (function (objInstance)
      {
      return (objInstance.segmentList.size() == st)
      }).length;
    }, st, {deferEvaluation: true})*/
  }

/*
function DateFilter () {
    var st = this;

    this.isClicked = ko.observable(false);

    this.count = ko.computed(function () {
        return Application.instances().filter(function (objInstance) {
            console.log((objInstance.date <= Application.roofDateFltr && objInstance.date >= Application.bottomDateFltr));
            return ((objInstance.date <= Application.roofDateFltr && objInstance.date >= Application.bottomDateFltr))
        }).length;
    }, st, {deferEvaluation: true})
}
*/

function Instance ()
  {
  var self = this;

  this.entityURI = "";
  
  this.formula = 
    {
    uri:         "",
    latexSource: "",
    imgSrc:      ko.computed(function()
      {
      return ("http://s.wordpress.com/latex.php?latex="+ self.formula.latexSource +"&bg=ffffff&fg=000000&s=0");
      }, this, {deferEvaluation: true}),
    latexMathJax: ko.computed(function()
      {
      return ("$"+ this.formula.latexSource +"$");
      }, this, {deferEvaluation: true})
    }

      this.notationList = new Map();
  this.notation =
    {
    latexSource: "",
    imgSrc:      ko.computed(function()
      {
      return ("http://s.wordpress.com/latex.php?latex="+ this.notation.latexSource +"&bg=ffffff&fg=000000&s=0");
      }, this, {deferEvaluation: true}),
    latexMathJax: ko.computed(function()
      {
      return ("$"+ this.notation.latexSource +"$");
      }, this, {deferEvaluation: true})
    }

  this.segmentList =
      {
          segments: "",
          segmentArr: [],
          createArr: ko.computed(function ()
          {
              var segs = this.segmentList.segments.split(" ");
              this.segmentList.segmentArr = [];
              for (var i = 0; i <  segs.length; i++) {
                  this.segmentList.segmentArr.push(this.segmentType( segs[i]));
              }
          }, this, {deferEvaluation: true}),
          segmentShow:   ko.computed(function ()
            {
              this.segmentList.createArr();
              var str = "";
              for (var i = 0; i < this.segmentList.segmentArr.length; i++) {
                  if (this.segmentList.segmentArr[i].isChecked() && this.segmentList.segmentArr[i].isChecked) {
                      str += this.segmentList.segmentArr[i].name + ", ";
                  }
              }
              str = str.substr(0, str.length-2);
              return (str);
            }, this, {deferEvaluation: true})
      }
  this.segmentType = function(segmentTypeURI)
    {
    return (Application.segmentTypes [segmentTypeURI] || {});
    };

  this.date = "";
  this.isVisible = ko.computed(function()
    {
        return (this.segmentList.segmentShow() != "");
    }, self, {deferEvaluation: true})

  this.showDetails = function ()
    {
    var objDetails = Application.Details;
    
    objDetails.status ("opened");
    objDetails.variables.status ("loading");
    objDetails.metadata.status ("loading");
    
    objDetails.formula (self.formula);
    
    Application.get
      (
          "PREFIX moc: <http://cll.niimm.ksu.ru/ontologies/mocassin#>" +
          " PREFIX akt: <http://www.aktors.org/ontology/portal#>" +
          " SELECT DISTINCT ?article, ?title, ?pages, ?journal, ?journaltitle, ?year, ?issuenumber, ?author, ?authorname " +
          " WHERE  {  " +
          "?article moc:hasSegment ?segment;           " +
          "rdf:type akt:Article-Reference;           " +
          "akt:has-title ?title;           " +
          "akt:has-pages ?pages;           " +
          "akt:included-in-publication ?journal.  " +

          "?journal akt:has-title ?journaltitle;           " +
          "akt:has-date ?year;           " +
          "akt:has-issue-number ?issuenumber.  " +

          "?article akt:has-author ?author.    " +
          "{    " +
          "SELECT ?author, MIN (?name) AS ?authorname   " +
          " WHERE      " +
          "{      " +
          "?author akt:full-name ?name .      " +
          "FILTER (lang(?name) = 'en')      " +
          "}    GROUP BY ?author    " +
          "}  " +

          "?segment rdf:type ?t;           " +
          "moc:mentions <"+ self.entityURI +">.  " +

          "FILTER ( lang(?title) = 'en' )  " +
          "FILTER ( lang(?journaltitle) = 'en' )  " +
          "}"
      )
    .then (function (objResult)
      {
      var objBindings = objResult.results.bindings[0];
      console.log(objResult);
      console.log (objBindings);
      
      objDetails.metadata.article
        .id (objBindings.article.value.match (/[0-9]+/)[0])
        .title (objBindings.title.value)
        .pages (objBindings.pages.value);
        
      objDetails.metadata.journal
        .title (objBindings.journaltitle.value.replace(/\s*$/, ""))
        .year (objBindings.year.value.match (/[0-9]+/)[0])
        .issueNumber (objBindings.issuenumber.value);

      var arAuthors = objResult.results.bindings.map (function (objBinding)
        {
        var objAuthor = new objDetails.metadata.article.Author ();
          objAuthor.id   = (objBinding.author.value+"").match (/[0-9]+/)[0];
          objAuthor.name = objBinding.authorname.value;
        return (objAuthor);
        })
      arAuthors [arAuthors.length-1].isNotLast = false;
      
      objDetails.metadata.article.authors (arAuthors);
      
      objDetails.metadata.status ("done");
      
      Application.mj();
      })
    ["catch"] (function (e)
      {
      console.log (e);
      objDetails.metadata.status ("error");
      })
      
    Application.get
      (
      "PREFIX moc: <http://cll.niimm.ksu.ru/ontologies/mocassin#>"+
      "SELECT DISTINCT ?class, ?latexSource, ?classLabel "+
      "WHERE"+
      "  {"+
      "  <"+ self.formula.uri +">"+
      "           moc:hasPart ?notation."+
      "  ?notation a moc:Variable;"+
      "            moc:hasLatexSource ?latexSource."+
      "  ?entity a ?class;"+
      "          moc:hasNotation ?notation."+
      
      "  OPTIONAL"+
      "    {"+
      "    ?class rdfs:label ?classLabel."+
      "    FILTER (lang(?classLabel) = 'en')"+
      "    }"+
      "  OPTIONAL"+
      "    {"+
      "    ?class skos:closeMatch ?dbpedianame."+
      "    }"+
      "  }"
      )
    .then (function (objResult)
      {
      var arVariables = [];
      
      objResult.results.bindings.map (function (objBinding)
        {
        var objVariable = new objDetails.variables.Variable();
        
        objVariable.latexSource = objBinding.latexSource.value;
      
        objVariable.classLabel;
        if (objBinding.classLabel)
          objVariable.classLabel = objBinding.classLabel.value;
        else if (objBinding.dbpedianame)
          objVariable.classLabel = objBinding.dbpedianame.value;
        else
          return;
        
        arVariables.push (objVariable);
        })
      
      objDetails.variables.list (arVariables);
      
      Application.mj();
      
      objDetails.variables.status ("done");
      })
    ["catch"] (function (e)
      {
      //console.log (e);
      objDetails.variables.status ("error");
      })
    }
  }

Application.Details = new (function ()
  {
  this.status = ko.observable("closed");
 
  this.formula = ko.observable({});
  
  this.variables = 
    {
    status: ko.observable("loading"),
    list: ko.observable([]),
    
    Variable: function ()
      {
      this.latexSource = "";
      this.classLabel = "";
      this.imgSrc = ko.computed (function ()
        {
        return ("http://s.wordpress.com/latex.php?latex="+ this.latexSource +"&bg=ffffff&fg=000000&s=0");
        }, this, {deferEvaluation: true})
      this.latexMathJax = ko.computed(function()
        {
        return ("$"+ this.latexSource +"$");
        }, this, {deferEvaluation: true})
      }
    }
    
  this.metadata = 
    {
    status: ko.observable("loading"),
    
    article:
      {
      id:      ko.observable(""),
      title:   ko.observable(""),
      pages:   ko.observable(""),
      url:     ko.computed (function ()
        {
        return ("http://www.mathnet.ru/php/archive.phtml?wshow=paper&jrnid=ivm&paperid="+ this.metadata.article.id() +"&option_lang=eng");
        }, this, {deferEvaluation: true}),
      pdfUrl:    ko.computed (function ()
        {
        return ("http://www.mathnet.ru/php/getFT.phtml?jrnid=ivm&paperid="+ this.metadata.article.id() +"&what=fullt&option_lang=rus");
        }, this, {deferEvaluation: true}),
        
      authors: ko.observable([]),
      
      Author: function ()
        {
        this.id   = 0;
        this.name = "";
        this.isNotLast = true;
        this.url  = ko.computed (function ()
          {
          return ("http://www.mathnet.ru/php/person.phtml?option_lang=eng&personid="+ this.id +"");
          }, this, {deferEvaluation: true})
        }
      },
    
    journal:
      {
      title:       ko.observable(""),
      issueNumber: ko.observable(""),
      year:        ko.observable(""),
      issueUrl:    ko.computed (function ()
        {
        return ("http://www.mathnet.ru/php/contents.phtml?wshow=issue&jrnid=ivm&year="+this.metadata.journal.year()+"&volume=&issue="+this.metadata.journal.issueNumber()+"&series=0&&option_lang=eng");
        }, this, {deferEvaluation: true})
      }
    }
    
  })();
  

$(document).ready(function()
  {
  Application.init ();
  ko.applyBindings(Application);
  
  $("#btnGo").on ("click", function ()
    {
    Application.searchNew ();
    });

  $("#btnFilter").on ("click", function ()
   {
     var bot = document.getElementById("bottomDateFltr");
     var roof = document.getElementById("roofDateFltr");    //TODO: ФИЛЬТРАЦИЯ
     if (!(bot == "" && roof == "")) {
         if (!(bot == "" )) {
            Application.bottomDateFltr = bot.value;
         }
         if (!(roof == "" ))
            Application.roofDateFltr = roof.value;
     }
     Application.authorFltr = document.getElementById("authorFltr").value;
     Application.journalFltr = document.getElementById("publFltr").value;
     console.log(Application.authorFltr);
     //filterSearch();
     //Application.instancesFiltered().length;
       /*Application.instances().filter (function (objInstance)
       {
           console.log(objInstance.isVisible ());
           return (objInstance.isVisible ());
       });*/
   });

  $("#search").on ("submit", function (event)
    {
    Application.searchNew ();
    event.preventDefault();
    }); 
  
  $("#details").on("hidden.bs.modal", function (e)
    {
    Application.Details.status ("closed");
    });
  
  Application.emptyQueryMessage.visible.subscribe (function (isError)
    {
    if (isError)
      $("#concept-uri").popover({trigger: "manual"}).popover("show").focus ();
    else
      $("#concept-uri").popover("hide");
    });
  $("#concept-uri").on ("blur", function ()
    {
    Application.emptyQueryMessage.visible (false);
    });
    
  $("#examples a").on ("click", function ()
    {
        $('input.flexdatalist').val($(this).text());
    Application.searchNew ($(this).text());
    });

  $("#sortIcon").on ("click", function () {
      if (Application.query.isAscending()) {
          Application.query.isAscending(false);
          Application.instances.sort(
              function (left, right) {
                  return left.date == right.date ? 0 : (left.date > right.date ? -1 : 1)
              })
      }
      else {
          Application.query.isAscending(true);
          Application.instances.sort(
              function (left, right) {
                  return left.date == right.date ? 0 : (left.date < right.date ? -1 : 1)
              })
      }
  })

  $("#details").on ("click", ".classlabel", function ()
    {
    $('input.flexdatalist').val(ko.dataFor(this).classLabel);
    Application.searchNew (ko.dataFor(this).classLabel);
    Application.Details.status ("closed");
    });

  $("[data-toggle=tooltip]").tooltip();
  
  (function ()
    {
    MathJax.Hub.Config(
      {
      tex2jax:
        {
        inlineMath: [["$","$"],["\\(","\\)"]]
         }
       });
    $("<div>$a$</div>").appendTo ("body").hide();
    Application.mj();
    })();
  
  Application.config.useMathJax.subscribe (function (value)
    {
    if (value) setTimeout (function () {Application.mj()}, 100);
    });
  
  })
