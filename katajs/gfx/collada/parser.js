"use strict";
/***************************************************************************************
                                        SAX EVENT HANDLER
***************************************************************************************/

var xmlHandler = function() {
    /*************************************************************************************
    Function:       variable= new xmlHandler()

    author:         xwisdom@yahoo.com

    description:
        constructor for the SAX Event sink

    ************************************************************************************/

    this.m_strError='';
    this.m_treeNodes=[];	 // stores nodes
    this.m_treePaths=[]; // stores path info
    this.m_xPath=[''];	 // stores current path info
    this.m_text=[''];	 // stores node text info
    this.m_cdata=[''];	// stores node cdata info
    this.m_comment=[''];	// stores node comment info
    this.m_attr=[''];	// stores node attribute info
    this.m_pi=[''];		// store pi info - not used
    this.cdata=false ;
    this.curpath='';
    this.cnt=0;

}; // end function xmlHandler

xmlHandler.prototype.characters = function(data, start, length) {
    /*************************************************************************************
    Function:       object.characters(String data, Int start, Int length)
					-> data: xml data
					-> start of text/cdata entity
					-> length of text/cdata entity

    author:         xwisdom@yahoo.com

    description:
    	this event is triggered whenever a text/cdata entity is encounter by the sax2 parser

    ************************************************************************************/

    // capture characters from CDATA and Text entities
    var text=data.substr(start, length);
    if (text=='\n' ) {
        return null // get ride of blank text lines
    }

    if (this.m_treeNodes[this.m_xPath.join('/')]){
        if(this.cdata==false){
            if (!this.m_text[this.cnt]) {
                this.m_text[this.cnt]='';
            }
            this.m_text[this.cnt]+=text;
        }
        else {
            if (!this.m_cdata[this.cnt]) {
                this.m_cdata[this.cnt]='';
            }
            this.m_cdata[this.cnt]+=text;
        }
    }
}; // end function characters


xmlHandler.prototype.comment = function(data, start, length) {
    /*************************************************************************************
    Function:       object.comment(String data, Int start, Int length)

    author:         xwisdom@yahoo.com

    description:
		triggered whenever a comment <!-- text --> is found. Same as the character event

    ************************************************************************************/

    var comment=data.substr(start, length);
    this.m_comment[this.cnt]=comment;

};// end function comment


xmlHandler.prototype.endCDATA = function() {
    /*************************************************************************************
    Function:       object.endCDATA()

    author:         xwisdom@yahoo.com

    description:
    	triggered at the end of cdata entity

    ************************************************************************************/

    // end of CDATA entity
    this.cdata=false;

}; // end function endCDATA


xmlHandler.prototype.endDocument = function() {
    /*************************************************************************************
    Function:       object.endDocument()

    author:         xwisdom@yahoo.com

    description:
    	end of document parsing - last event triggered by the sax2 parser

    ************************************************************************************/

} // end function end Document


xmlHandler.prototype.endElement = function(name) {
    /*************************************************************************************
    Function:       object.endElement(String tagname)
					-> tagname: name of tag

    author:         xwisdom@yahoo.com

    description:
    	last event trigger when a node is encounter by the sax2 parser

    ************************************************************************************/

    // remove the current node from the path array
    this.m_xPath=this.m_xPath.slice(0,-1);

}; // end function end Element


xmlHandler.prototype.error = function(exception) {
    /*************************************************************************************
    Function:       object.error(String exception)

    author:         xwisdom@yahoo.com

    description:
		triggered whenever an error is encounter by the sax2 parser

    ************************************************************************************/

    this.m_strError+='Error:'+exception.getMessage()+'\n';

}; // end function error


xmlHandler.prototype.fatalError = function(exception) {
    /*************************************************************************************
    Function:       object.fatalError(String exception)

    author:         xwisdom@yahoo.com

    description:
		triggered whenever an error is encounter by the sax2 parser

    ************************************************************************************/

    this.m_strError+='fata error:'+exception.getMessage()+'\n';

}; // end function fatalError


xmlHandler.prototype.getAttr_Array= function() {
    /*************************************************************************************
    Function:       getAttr_Array

    author:         xwisdom@yahoo.com
    ************************************************************************************/

    return this.m_attr;

};  // end function getAttr_Array


xmlHandler.prototype.getCDATA_Array= function() {
    /*************************************************************************************
    Function:       getCDATA_Array

    author:         xwisdom@yahoo.com
    ************************************************************************************/

    return this.m_cdata;

};  // end function getCDATA_Array


xmlHandler.prototype.getCMENT_Array= function() {
    /*************************************************************************************
    Function:       getCMENT_Array

    author:         xwisdom@yahoo.com
    ************************************************************************************/

    return this.m_comment;

};  // end function getCMENT_ARRAY


xmlHandler.prototype.getError = function() {
    /*************************************************************************************
    Function:       getError

    author:         xwisdom@yahoo.com
    ************************************************************************************/

    return this.m_strError;

}; // end function getError


xmlHandler.prototype.getPath_Array = function() {
    /*************************************************************************************
    Function:       getPath_Array

    author:         xwisdom@yahoo.com
    ************************************************************************************/

    return this.m_treePaths;

};  // end function getPath_Array


xmlHandler.prototype.getText_Array = function() {
    /*************************************************************************************
    Function:       getText_Array

    author:         xwisdom@yahoo.com
    ************************************************************************************/

    return this.m_text;

};  // end function getText_Array


xmlHandler.prototype.processingInstruction = function(target, data) {
    /*************************************************************************************
    Function:       object.processingInstruction(String target, String data)
						-> target: is tagname of the pi
						-> data: is the content of the pi

    author:         xwisdom@yahoo.com

    description:
    	capture PI data here

    ************************************************************************************/

} // end function processingInstruction


xmlHandler.prototype.setDocumentLocator = function(locator) {
    /*************************************************************************************
    Function:       object.setDocumentLocator(SAXDriver locator)

    author:         xwisdom@yahoo.com

    description:
		passes an instance of the SAXDriver to the handler

    ************************************************************************************/

    this.m_locator = locator;

}; // end function setDocumentLocator


xmlHandler.prototype.startCDATA = function() {
    /*************************************************************************************
    Function:       object.startCDATA()

    author:         xwisdom@yahoo.com

    description:
    	triggered whenever a cdata entity is encounter by the sax2 parser

    ************************************************************************************/


    // start of CDATA entity
    this.cdata=true;

}; // end function startCDATA


xmlHandler.prototype.startDocument = function() {
    /*************************************************************************************
    Function:       object.startDocument()

    author:         xwisdom@yahoo.com

    description:
    	start of document - first event triggered by the sax2 parser

    ************************************************************************************/

}; // end function startDocument


xmlHandler.prototype.startElement = function(name, atts) {
    /*************************************************************************************
    Function:       object.startElement(String tagname,Array content)
					-> tagname: name of tag
					-> content: [["attribute1", "value1"], ["attribute2", "value2"],....,n]

    author:         xwisdom@yahoo.com

    description:
    	First event trigger when a node is encounter by the sax2 parser
    	the name and attribute contents are passed to this event

    ************************************************************************************/

    // Note: the following code is used to store info about the node
    // into arrays for use the tree node layout

    var ppath;
    var att_count=atts.getLength();
    var pnode;
    var node;

    // get previous path
    ppath=this.m_xPath.join('/');
    if (!ppath) ppath="/";
    // get current path
    this.m_xPath[this.m_xPath.length]=name;
    this.curpath=this.m_xPath.join('/');

    this.cnt++;
    this.m_treePaths[this.cnt]=this.curpath;

    pnode=this.m_treeNodes[ppath];
    if(!pnode){
        pnode=new Node(name,"javascript:showTagInfo('"+this.cnt+"')","",xmlRoot);
        this.m_treeNodes[this.curpath]=pnode;
        xmlRoot.addNode(pnode);
    }
    else {
        node=new Node(name,"javascript:showTagInfo('"+this.cnt+"')","",xmlRoot);
        pnode.addNode(node);
        this.m_treeNodes[this.curpath]=node;
    }

    // get attributes
    if (att_count) {
        var attr=[];
        for (i=0;i<att_count;i++){
            attr[atts.getName(i)]=atts.getValue(i);
        }
        this.m_attr[this.cnt]=attr;
    }
}; // end function startElement


xmlHandler.prototype.warning = function(exception) {
    /*************************************************************************************
    Function:       object.warninng(String exception)

    author:         xwisdom@yahoo.com

    description:
		triggered whenever an error is encounter by the sax2 parser

    ************************************************************************************/

    this.m_strError+='Warning:'+exception.getMessage()+'\n'

}; // end function warning




var colladaSaxString=function(colladaDocument) {
    var parser = new SAXDriver();
    var handler = new xmlHandler();
    // pass handlers to the sax2 parser
    parser.setDocumentHandler(handler);
    parser.setErrorHandler(handler);
    parser.setLexicalHandler(handler);
    parser.parse(colladaDocument); // start parsing
    var err=handler.getError();
    if(err) {
        alert(err);
    }else{
        // stores node element info in arrays
        xmlTextArray=handler.getText_Array();
        xmlCDataArray=handler.getCDATA_Array();
        xmlAttrArray=handler.getAttr_Array();
        xmlPathArray=handler.getPath_Array();
        xmlCMENTArray=handler.getCMENT_Array();
    }
    
};



var colladaParseString=function(colladaDocument, domCallback) {
    var errors=[];
    var errorFunc =function(err) {
        errors[errors.length]=err;
    };
    var dom=new XMLDoc(colladaDocument,errorFunc);
    domCallback(dom,errors);
};



var colladaParseURI=function(url, domCallback) {
    var req=new XMLHttpRequest();
    req.onreadystatechange= function () {
        if(this.readyState==2&&this.status!=200&&this.status!=0) {
            domCallback();//callback with no info;
        }
       	if(this.readyState  == 4&&(this.status  == 200 || this.status==0)){
            colladaParseString(req.responseText,domCallback);
        }
    };
    req.open("GET",url,true);
    req.send();

};

