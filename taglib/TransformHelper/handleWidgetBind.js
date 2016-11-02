
/*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

var path = require('path');

module.exports = function handleWidgetBind() {
    var el = this.el;
    var context = this.context;
    var builder = this.builder;

    var bindAttr = el.getAttribute('w-bind');
    if (bindAttr == null) {
        return;
    }

    // A widget is bound to the el...

    // Remove the w-bind attribute since we don't want it showing up in the output DOM
    el.removeAttribute('w-bind');

    // Read the value for the w-bind attribute. This will be an AST node for the parsed JavaScript
    var bindAttrValue = bindAttr.value;
    var modulePath;

    var widgetAttrs = {};

    if (bindAttrValue == null) {
        let component = getInlineComponent(context);
        if(component) {
            widgetAttrs.type = context.addStaticVar('__widgetType', builder.literal({
                name: builder.literal(path.basename(context.dirname)),
                def: builder.functionDeclaration(null, [] /* params */, [
                    builder.returnStatement(
                        builder.memberExpression('module', 'exports')
                    )
                ])
            }));
            context.on('beforeGenerateCode:TemplateRoot', function(root) {
                root.node.generateExports = function(template) {
                    return buildExport(builder, component, template);
                };
            });
        } else {
            modulePath = this.getDefaultWidgetModule();
            if (!modulePath) {
                this.addError('Invalid "w-bind" attribute. No corresponding JavaScript module found in the same directory (either "widget.js" or "index.js"). Actual: ' + modulePath);
                return;
            }
        }
    } else if (bindAttr.isLiteralValue()) {
        modulePath = bindAttr.literalValue; // The value of the literal value
        if (typeof modulePath !== 'string') {
            this.addError('The value for the "w-bind" attribute should be a string. Actual: ' + modulePath);
            return;
        }
    } else {
        // This is a dynamic expression. The <widget-types> should have been found.
        if (!context.isFlagSet('hasWidgetTypes')) {
            this.addError('The <widget-types> tag must be used to declare widgets when the value of the "w-bind" attribute is a dynamic expression.');
            return;
        }

        widgetAttrs.type = builder.computedMemberExpression(
            builder.identifier('__widgetTypes'),
            bindAttrValue);
    }

    if (modulePath) {
        let widgetTypeNode;
        if(path.basename(modulePath) === 'component') {
            widgetTypeNode = context.addStaticVar('__widgetType', builder.literal({
                name: builder.literal(modulePath),
                def: builder.functionDeclaration(null, [] /* params */, [
                    builder.returnStatement(
                        builder.memberExpression('module', 'exports')
                    )
                ])
            }));
            context.on('beforeGenerateCode:TemplateRoot', function(root) {
                root.node.generateExports = function(template) {
                    var component = builder.require(builder.literal(modulePath));
                    return buildExport(builder, component, template);
                };
            });
        } else {
            widgetTypeNode = context.addStaticVar('__widgetType', this.buildWidgetTypeNode(modulePath));
        }
        widgetAttrs.type = widgetTypeNode;
    }

    var id = el.getAttributeValue('id');

    if (el.hasAttribute('w-config')) {
        widgetAttrs.config = el.getAttributeValue('w-config');
        el.removeAttribute('w-config');
    }

    if (id) {
        widgetAttrs.id = id;
    }

    var widgetNode = context.createNodeForEl('w-widget', widgetAttrs);
    el.wrapWith(widgetNode);

    el.setAttributeValue('id', builder.memberExpression(builder.identifier('widget'), builder.identifier('id')));

    // var _widgetAttrs = __markoWidgets.attrs;
    var widgetAttrsVar = context.addStaticVar('__widgetAttrs',
        builder.memberExpression(this.markoWidgetsVar, builder.identifier('attrs')));

    el.addDynamicAttributes(builder.functionCall(widgetAttrsVar, [ builder.identifier('widget') ]));

    this.widgetStack.push({
        widgetNode: widgetNode,
        el: el,
        extend: false
    });
};

function getInlineComponent(context) {
    var builder = context.builder;
    var component;
    context.root.body.array.some(node => {
        if(node.tagName === 'script' && node.getAttribute('component')) {
            node.detach();
            component = builder.selfInvokingFunction([
                builder.code(node.body.array[0].argument.value)
            ]);
            return true;
        }
    });
    return component;
}

function buildExport(builder, component, template) {
    return [
        builder.assignment(
            builder.var('component'),
            component
        ),
        builder.assignment(
            builder.var('template'),
            template
        ),
        builder.assignment(
            builder.memberExpression(
                builder.identifier('module'),
                builder.identifier('exports')
            ),
            builder.functionCall(
                builder.memberExpression(
                    builder.require(
                        builder.literal('marko-widgets')
                    ),
                    builder.identifier('c')
                ),
                [
                    builder.identifier('component'),
                    builder.identifier('template')
                ]
            )
        )
    ];
}