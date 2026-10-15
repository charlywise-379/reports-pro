import { describe, it, expect } from 'vitest'
import { renderTemplate, escapeHtml } from './reportRender'

describe('renderTemplate (comportamiento v1)', () => {
  it('sustituye valores simples y deja vacío lo que no existe', () => {
    expect(renderTemplate('Hola {{name}} {{missing}}!', { name: 'Ana' })).toBe('Hola Ana !')
  })
  it('recorre arreglos de objetos y de textos', () => {
    const tpl = '<ul>{{#each items}}<li>{{this.n}}</li>{{/each}}</ul><p>{{#each tags}}[{{this}}]{{/each}}</p>'
    expect(renderTemplate(tpl, { items: [{ n: 1 }, { n: 2 }], tags: ['a', 'b'] }))
      .toBe('<ul><li>1</li><li>2</li></ul><p>[a][b]</p>')
  })
  it('un arreglo faltante produce cadena vacía', () => {
    expect(renderTemplate('<i>{{#each nada}}x{{/each}}</i>', {})).toBe('<i></i>')
  })
  it('sin opciones NO escapa HTML (compatibilidad con v1)', () => {
    expect(renderTemplate('{{t}}', { t: '<b>&</b>' })).toBe('<b>&</b>')
  })
})

describe('renderTemplate con escape', () => {
  it('escapa & < > " \' en valores simples, de lista y de texto', () => {
    const data = { t: '<b>&"\'</b>', items: [{ n: '<i>' }], tags: ['<s>'] }
    const tpl = '{{t}}|{{#each items}}{{this.n}}{{/each}}|{{#each tags}}{{this}}{{/each}}'
    expect(renderTemplate(tpl, data, { escape: true }))
      .toBe('&lt;b&gt;&amp;&quot;&#39;&lt;/b&gt;|&lt;i&gt;|&lt;s&gt;')
  })
  it('escapeHtml escapa el ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })
})
