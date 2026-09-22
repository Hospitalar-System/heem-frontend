# HEMM — Design System & Specification

HEMM (Hospital Equipment Maintenance Management) é um **console de operação hospitalar de alta densidade de dados** [1, 3]. Diferente de softwares genéricos ou apps de consumo, o Design System do HEMM é focado na clareza e urgência operacional [1, 3].

O sistema suporta alternância dinâmica de tema em 3 modos:
- **Dark Mode** (Escuro por padrão — ideal para centrais de controle, ambientes hospitalares de baixa iluminação e plantões noturnos) [1, 3].
- **Light Mode** (Claro — otimizado para escritórios administrativos bem iluminados) [2].
- **Auto Mode** (Sincronização automática com as preferências do Sistema Operacional).

---

## 🎨 1. Theme Strategy & Semantic Tokens

Para suportar **Dark**, **Light** e **Auto (Sistema)** sem duplicação de código ou *hardcode* de cores, utilizamos **Variáveis CSS Semânticas** que alteram automaticamente com a classe `.dark` ou `.light` aplicada na raiz (``).

### 1.1 Tabela de Tokens Semânticos

| Token Semântico | Dark Mode (Padrão) | Light Mode | Aplicação Operacional |
| :--- | :--- | :--- | :--- |
| `--bg` | `#1F1F1F` | `#F4F5F7` | Fundo base de toda a tela [4] |
| `--surface` | `#2A2A2E` | `#FFFFFF` | Cards, modais, sidebar e linhas de tabela em hover [4] |
| `--border` | `#3A3A3E` | `#E2E8F0` | Linhas divisórias, contornos de inputs e cards [4] |
| `--text-primary` | `#F5F5F5` | `#18181B` | Títulos, textos principais e valores de KPIs [4] |
| `--text-secondary` | `#C2C2C2` | `#52525B` | Subtítulos, metadados, timestamps e labels [4] |
| `--text-muted` | `#8A8A90` | `#A1A1AA` | Placeholders, textos desabilitados e skeletons [4] |
| `--primary` | `#3ED597` | `#2EB87E` | Ação primária e status "OK/Saudável" (WCAG AA) [4] |
| `--primary-hover` | `#38B38C` | `#249666` | Hover do botão primário [4] |
| `--danger` | `#FF4E4E` | `#DC2626` | Severidade crítica, chamado vencido, ação destrutiva [4] |
| `--warning` | `#F5A623` | `#D97706` | Manutenção devida, severidade alta/média, atenção [4] |

---

## 💻 2. Declaração das Variáveis no CSS Global (`src/app/styles/globals.css`)
```css
@layer base {
  /* Tema Claro */
  :root, .light {
    --bg: #F4F5F7;
    --surface: #FFFFFF;
    --border: #E2E8F0;
    --text-primary: #18181B;
    --text-secondary: #52525B;
    --text-muted: #A1A1AA;
    --primary: #2EB87E;
    --primary-hover: #249666;
    --danger: #DC2626;
    --warning: #D97706;
  }

  /* Tema Escuro (Padrão) */
  .dark {
    --bg: #1F1F1F;
    --surface: #2A2A2E;
    --border: #3A3A3E;
    --text-primary: #F5F5F5;
    --text-secondary: #C2C2C2;
    --text-muted: #8A8A90;
    --primary: #3ED597;
    --primary-hover: #38B38C;
    --danger: #FF4E4E;
    --warning: #F5A623;
  }
}

body {
  background-color: var(--bg);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  transition: background-color 0.2s ease, color 0.2s ease;
}
```
