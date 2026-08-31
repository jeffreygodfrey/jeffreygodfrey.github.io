---
title: I built a theme from a single color.
date: 2026-08-06
tags: css, colors
excerpt: This allows me to define recognizable colors and calculate accurately what the derivation will be while preserving saturation and lightness between hues.
---

The traditional way to build a theme (at least as far as I understand it) is to choose a number of colors that work well together and define them as custom properties in the root of your CSS file. This works well and is probably something that most people do. However, there is another way and I think it's a fun way to think about how the colors work together. When we think about colors for a theme there are different color spaces you can work in and each have own their benefits and limitations. I won't get into those because that's a bit out of scope for this article, but suffice it to say that I prefer defining my colors in HSL and I like the consistency between colors that you get from OKLCH.

# Single Base Color Theme

I wanted a way to define a single base color and mathematically derive other colors from the base color. This enables me to change the theme by updating the base color (and maybe some of the calculations as well, more on that later). The basic idea is that you'll still have however many variables you need for colors you need to use, but they will all come from a single base color using relative color syntax. Relative color syntax is simply a method by which the derivation of any color can be achieved. I've taken that concept to the level of using a single base color to mathematically generate an easy to maintain palette of colors.

I understand that this might not be an idea that everyone will like, but for me it solves a couple problems. I also understand that using variables, relative color syntax, and OKLCH in CSS isn't a new concept either. These are all well known technologies that many websites already use. However, using them together to this degree is probably something that isn't very common.

Relative color syntax is supported by most modern browsers, and this is a good addition because it reduces complexity required to define alternate colors that change dynamically with a defined base color. The benefit of this is that since your browser can handle all the calculations, this effectively turns it into a color engine.

In order to provide consistency across all hues when changing chroma and lightness, these calculations make use of OKLCH. Furthermore, I define the base color in HSL because to me, it's easy to look at the numbers and figure out roughly what the color will be. This is because hue values are easy to remember. Hue numbers are in degrees and the primary and secondary color hue degrees are 0 (or 360) for Red, 60 for Yellow, 120 for Green, 180 for Cyan, 240 for Blue, and 300 for Magenta. Saturation and lightness simply use a percentage with 0 being least saturated and lightned and 100 the most. This allows me to define recognizable colors and calculate accurately what the derivation will be while preserving saturation and lightness between hues.

OKLCH uses Lightness, Chroma, and Hue. It is a relatively new color space that is used in CSS (and maybe other applications as well). The numbers used to define Lightness and Hue in OKLCH are very similar in how they are used in HSL, but chroma is a bit different. Hue is still the same 0-360 degree scale, and lightness is still from 0-100. Chroma defines how intense a color is much like Saturation from HSL does. The differences between Chroma and Saturation could be a discussion all on it's own, but just understand that saturation measures color intensity and chroma is how far a color is from neutral gray. Along with Lightness, Chroma is consistent across different hues which makes it ideal for using in calculations.

We can use math to adjust colors in order to define proportional relationships between color variables. You CAN use addition or subtraction to adjust chroma and lightness, but you can quickly run into out of gamut ranges. Therefore, it is best to multiplication to adjust your colors for more predictable results should you choose to change the base color later. During my testing, I found that colors that were adjusted with calc using addition and subtraction were less likely to produce a result that was satisfying. I also ran into an issue where using mulitplication could put the colors in a state where nothing was readable, so I set some hard percentage variables and used that for lightness instead of calculating lightness on the fly. They you use a percentage variable in place of the lightness value.

So, instead of using addition and subtraction like this:

```css
calc(c + 0.05)
calc(c - 0.1)
```

You can use multiplication like this:

```css
calc(c * 0.8)
calc(c * 0.9)
```

Color theory is something I find interesting. Using color theory here as well really fits the core idea. Instead of guessing at what might look good you could possibly use complementary colors. Complimentary colors are 180 degrees apart; color pairs like Red and Cyan, Blue and Yellow, Green and Magenta. Maybe you don't want the exact opposite hue though, and in that case you can pick two colors opposite your base color where they are 36 degrees either side of 180 giving you 144 and 216 degrees. Hue is a circular definition so if you go beyond 360 it just wraps around past 0.

```css
calc(h + 144)
calc(h - 144)
```

This is a mindset change because you're not limited by time when designing a theme. You don't have to rely on many tools to change your theme. After you get the structure the way you want, the most you'll need is your browser's Dev tools. because you can click the preview swatch for the base color and change it and see your website theme change in realtime.

You're not picking colors, you're defining rules for your theme. Combine this with hard percentages for lightness and you can be compliant with WCAG for accessiblity and readability. This makes it so screen readers can better distinguish your text apart from your background color.

Putting all this together and you get something like this.

```css
:root {
  --base: hsl(220, 100%, 50%);

  --base-L: 70%;

  --accent1: oklch(from var(--base) var(--base-L) c calc(h + 144));
  --accent2: oklch(from var(--base) var(--base-L) c calc(h - 144));
}
```

I'm not claiming to have invented anything. This is simply a recount of how i came up with a system to define a website color theme using a single color. The biggest thing I got out of this whole process is what I learned about color spaces and how they can be manipulated in order to define other colors. In this case, I used it to plan out an entire theme with one base color. Since all this exists in CSS, there is no additional javascript needed to make it work.

10. Live demo.

A sample page to act as a demonstration with sliders for Hue, Saturation, and Lightness. Allow changing the base color and have the other defined colors update automatically.