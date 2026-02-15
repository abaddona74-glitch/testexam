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
    // "Easy", "Middle", "Hard" so'zlari sahifada borligini tekshirish
    cy.contains('Easy').should('be.visible')
    cy.contains('Middle').should('be.visible')
    cy.contains('Hard').should('be.visible')
  })

  it('Imtihon jadvali (Exam Schedule) ko\'rinishi kerak', () => {
    // "Call 1" yoki jadval elementlarini tekshirish
    cy.contains('Call 1').should('exist')
    cy.contains('Digitalization').should('exist')
  })
})