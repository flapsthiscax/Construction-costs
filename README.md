# Construction Cost Escalator

Quick ROMs and cost escalation for Vancouver and Calgary construction. It's a static site with no build step, so it runs on GitHub Pages as-is.

## What's in here

```
index.html              page markup
assets/css/style.css    styles
assets/js/app.js        calculators and charts (Chart.js 4.4.1 from cdnjs)
assets/img/favicon.svg  tab icon
data/data.js            all figures: StatCan BCPI, Altus, RLB, C&W, Altus Y-O-Y
.nojekyll               tells GitHub Pages to serve files untouched
```

## Publish on GitHub Pages

1. Replace the contents of the `constructioncostescalator` repo with everything in this folder, including `.nojekyll`. You can drag the files into **Add file → Upload files** on github.com.
2. Go to **Settings → Pages**. Set the source to **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. The site goes live at `https://estefant.github.io/constructioncostescalator/` within a minute or two.

## Connect your domain

1. In **Settings → Pages → Custom domain**, enter your domain (e.g. `costescalator.ca`) and save. GitHub adds a `CNAME` file to the repo for you.
2. At your domain registrar, add these DNS records:
   - **Root domain** (`costescalator.ca`): four `A` records pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`
   - **www** (`www.costescalator.ca`): a `CNAME` record pointing to `estefant.github.io`
3. When the DNS check passes (minutes to a few hours), tick **Enforce HTTPS**.

## Keeping it current

All the numbers live in `data/data.js`, so updating is just replacing that one file. The sources update on these schedules:

- **StatCan BCPI:** quarterly, about 5 weeks after each quarter ends. The next release (Q4 2026) is expected in early February 2027.
- **RLB:** quarterly.
- **Turner & Townsend Canada MI:** quarterly.
- **Altus Cost Guide:** annually, around April.

Altus Calgary, BTY and Turner & Townsend's cost table are behind sign-up forms. Download the PDFs and they can be added to the data file.

## Method notes

- **Escalation:** uses the StatCan index ratio between two quarters, all trade divisions, not seasonally adjusted. After Q3 2026 it compounds Turner & Townsend's provincial bid-price forecast quarterly (low, mid or high), then the 4.0% national baseline for 2028.
- **ROM base dates:** the Altus 2026 guide is treated as Q1 2026 pricing and RLB Q3 2026 as Q3 2026. Each building type is escalated on its closest StatCan index.
- **Series start dates:** StatCan's residential series start in 2017. High-rise apartment goes back to 1988, and non-residential types go back to 1981.
- **Cost ranges:** hard construction costs only. They exclude land, soft costs and GST.
