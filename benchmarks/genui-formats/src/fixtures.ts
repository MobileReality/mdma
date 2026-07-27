/**
 * Hand-written fixtures, one valid + one corrupted per format.
 *
 * These exist to answer the question that decides whether the benchmark means
 * anything: is each validator actually discriminating, or is it rubber-stamping
 * everything (making its format look good) / rejecting everything (making it
 * look bad)?
 *
 * The valid samples are written from each format's OWN documentation and
 * examples, not invented. Each expresses the same trivial UI: a heading and a
 * two-field contact form.
 */

export interface Fixture {
  valid: string;
  /** Corrupted in a way that a renderer for that format genuinely cannot render. */
  corrupted: string;
  /** What the corruption is, for the verify output. */
  corruption: string;
}

export const FIXTURES: Record<string, Fixture> = {
  mdma: {
    valid: `Here is the contact form you asked for.

\`\`\`mdma
type: form
id: contact-form
label: Contact us
fields:
  - name: full-name
    type: text
    label: Full name
    required: true
  - name: email
    type: email
    label: Email
    required: true
    sensitive: true
onSubmit: contact-submitted
\`\`\`
`,
    corrupted: `\`\`\`mdma
type: form
id: contact-form
fields:
  - name: full-name
    type: text
   label: Full name
      required: true
\`\`\`
`,
    corruption: 'broken YAML indentation inside the mdma block',
  },

  openui: {
    valid: `root = Stack([title, form])
title = TextContent("Contact us", "large-heavy")
form = Form("contact", [nameField, emailField])
nameField = FormControl("Full name", Input("name", "Your name", "text", ["required"]))
emailField = FormControl("Email", Input("email", "you@example.com", "email", ["required", "email"]))`,
    corrupted: `root = Stack([title, form])
title = TextContent("Contact us", "large-heavy")
form = Form("contact", [nameField, emailField])
nameField = FormControl("Full name", Input("name", "Your name", "text", ["required"]))`,
    corruption: 'emailField referenced from the form but never defined',
  },

  'json-render': {
    valid: [
      '{"op":"add","path":"/root","value":"main"}',
      '{"op":"add","path":"/elements/main","value":{"type":"Card","props":{"title":"Contact us"},"children":["name","email"]}}',
      '{"op":"add","path":"/elements/name","value":{"type":"Input","props":{"label":"Full name","name":"full-name"},"children":[]}}',
      '{"op":"add","path":"/elements/email","value":{"type":"Input","props":{"label":"Email","name":"email"},"children":[]}}',
    ].join('\n'),
    corrupted: [
      '{"op":"add","path":"/root","value":"main"}',
      '{"op":"add","path":"/elements/main","value":{"type":"ContactFormWidget","props":{"title":"Contact us"},"children":["name"]}}',
      '{"op":"add","path":"/elements/name","value":{"type":"Input","props":{"label":"Full name","name":"full-name"},"children":[]}}',
    ].join('\n'),
    corruption: 'element type "ContactFormWidget" is not in the catalog',
  },

  agenui: {
    valid: `\`\`\`json
{
  "version": "v0.9",
  "updateComponents": {
    "surfaceId": "contact_surface",
    "components": [
      { "id": "root", "component": "Column", "children": ["title", "name_field", "email_field"] },
      { "id": "title", "component": "Text", "text": { "path": "/contact/title" }, "variant": "h2" },
      { "id": "name_field", "component": "TextField", "label": { "path": "/contact/nameLabel" } },
      { "id": "email_field", "component": "TextField", "label": { "path": "/contact/emailLabel" } }
    ]
  }
}
\`\`\`

\`\`\`json
{
  "version": "v0.9",
  "updateDataModel": {
    "surfaceId": "contact_surface",
    "path": "/contact",
    "value": { "title": "Contact us", "nameLabel": "Full name", "emailLabel": "Email" }
  }
}
\`\`\`
`,
    corrupted: `\`\`\`json
{
  "version": "v0.9",
  "updateComponents": {
    "surfaceId": "contact_surface",
    "components": [
      { "id": "root", "component": "Column", "children": ["title", "name_field"] },
      { "id": "title", "component": "Text", "text": { "path": "/contact.title" }, "variant": "h2" }
    ]
  }
}
\`\`\`
`,
    corruption: 'dot-notation binding path, and "name_field" child never defined',
  },
  a2ui: {
    valid: `Here is the layout you asked for.

<a2ui-json>
[
  {
    "version": "v0.9",
    "createSurface": {
      "surfaceId": "gallery-complex-layout",
      "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"
    }
  },
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "gallery-complex-layout",
      "components": [
        {
          "id": "root",
          "component": "Column",
          "children": [
            "header",
            "form_row",
            "footer"
          ],
          "justify": "spaceBetween",
          "align": "stretch"
        },
        {
          "id": "header",
          "component": "Text",
          "text": "User Profile Form",
          "variant": "h1"
        },
        {
          "id": "form_row",
          "component": "Row",
          "children": [
            "first_name",
            "last_name"
          ],
          "justify": "start",
          "align": "start"
        },
        {
          "id": "first_name",
          "component": "TextField",
          "label": "First Name",
          "value": {
            "path": "/firstName"
          },
          "weight": 1
        },
        {
          "id": "last_name",
          "component": "TextField",
          "label": "Last Name",
          "value": {
            "path": "/lastName"
          },
          "weight": 1
        },
        {
          "id": "footer",
          "component": "Text",
          "text": "Please fill out all fields.",
          "variant": "caption"
        }
      ]
    }
  }
]
</a2ui-json>
`,
    corrupted: `<a2ui-json>
[
  {
    "version": "v0.9",
    "createSurface": {
      "surfaceId": "gallery-complex-layout"
    }
  },
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "gallery-complex-layout",
      "components": [
        {
          "id": "root",
          "component": "Column",
          "children": [
            "header",
            "form_row",
            "footer"
          ],
          "justify": "spaceBetween",
          "align": "stretch"
        },
        {
          "id": "header",
          "component": "Text",
          "text": "User Profile Form",
          "variant": "h1"
        },
        {
          "id": "form_row",
          "component": "Row",
          "children": [
            "first_name",
            "last_name"
          ],
          "justify": "start",
          "align": "start"
        },
        {
          "id": "first_name",
          "component": "TextField",
          "label": "First Name",
          "value": {
            "path": "/firstName"
          },
          "weight": 1
        },
        {
          "id": "last_name",
          "component": "TextField",
          "label": "Last Name",
          "value": {
            "path": "/lastName"
          },
          "weight": 1
        },
        {
          "id": "footer",
          "component": "Text",
          "text": "Please fill out all fields.",
          "variant": "caption"
        }
      ]
    }
  }
]
</a2ui-json>
`,
    corruption: 'createSurface is missing the required catalogId',
  },
};
