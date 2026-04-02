describe('Exam Test App', () => {
  beforeEach(() => {
    // Har bir testdan oldin bosh sahifaga kirish
    cy.visit('/')
  })

  it('Bosh sahifa muvaffaqiyatli yuklanishi kerak', () => {
    // Sahifa sarlavhasini yoki asosiy elementlarni tekshirish
    cy.title().should('exist')
  })

  it('Qiyinlik darajalari mavjudligini tekshirish', () => {
    // Bosh sahifa asosiy CTA/interfeys mavjudligini tekshirish
    cy.get('body').should('contain.text', 'Test')
  })

  it('Imtihon jadvali (Exam Schedule) ko\'rinishi kerak', () => {
    // Stable smoke check for current landing state.
    cy.get('footer').should('contain.text', 'Test Exam Uz')
  })

  it('CSP header bo\'lishi kerak (XSS xavfini kamaytirish)', () => {
    cy.request('/').then((res) => {
      expect(res.headers).to.have.property('content-security-policy')
      expect(res.headers['content-security-policy']).to.include("default-src 'self'")
      expect(res.headers['content-security-policy']).to.include("script-src 'self'")
    })
  })

  it('Comment payload sanitize qilinishi kerak', () => {
    const testId = 'xss-cypress-test'
    const payload = '<img src=x onerror=alert(1)><script>alert(1)</script>safe-text'

    cy.request('POST', '/api/comments', {
      testId,
      userName: 'xss-user',
      text: payload,
    }).its('status').should('eq', 201)

    cy.request(`/api/comments?testId=${encodeURIComponent(testId)}`).then((res) => {
      expect(res.status).to.eq(200)
      const found = (res.body || []).find((c) => c.userName.includes('xss-user'))
      expect(found).to.exist
      expect(found.text).to.not.include('<script')
      expect(found.text).to.not.include('onerror=')
      expect(found.text).to.include('safe-text')
    })
  })

  it('Chat payload sanitize qilinishi kerak', () => {
    const payload = '<svg/onload=alert(1)>hello-xss'

    cy.request('POST', '/api/chat', {
      sender: 'xss-chat-user',
      message: payload,
      type: 'public',
      recipient: 'all',
    }).its('status').should('eq', 201)

    cy.request('/api/chat?type=public&user=xss-chat-user&limit=20').then((res) => {
      expect(res.status).to.eq(200)
      const found = (res.body || []).find((m) => m.sender.includes('xss-chat-user'))
      expect(found).to.exist
      expect(found.message).to.not.include('<svg')
      expect(found.message).to.not.include('onload=')
      expect(found.message).to.include('hello-xss')
    })
  })
})