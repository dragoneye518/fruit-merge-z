#!/usr/bin/env python3
"""
SVG to PNG converter script for fruit images
Converts all SVG fruit images to PNG format for Douyin mini-game compatibility
"""

import os
import subprocess
import sys
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are available"""
    try:
        # Check if cairosvg is available
        import cairosvg
        return True
    except ImportError:
        print("cairosvg not found. Installing...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "cairosvg"])
            import cairosvg
            return True
        except Exception as e:
            print(f"Failed to install cairosvg: {e}")
            return False

def convert_svg_to_png(svg_path, png_path, width=200, height=200):
    """Convert SVG file to PNG with specified dimensions"""
    try:
        import cairosvg
        cairosvg.svg2png(
            url=str(svg_path),
            write_to=str(png_path),
            output_width=width,
            output_height=height
        )
        print(f"✓ Converted {svg_path.name} -> {png_path.name}")
        return True
    except Exception as e:
        print(f"✗ Failed to convert {svg_path.name}: {e}")
        return False

def main():
    """Main conversion function"""
    # Check dependencies
    if not check_dependencies():
        print("Cannot proceed without cairosvg. Please install it manually:")
        print("pip install cairosvg")
        return False
    
    # Define paths
    assets_dir = Path(__file__).parent / "assets" / "images" / "fruits"
    
    if not assets_dir.exists():
        print(f"Assets directory not found: {assets_dir}")
        return False
    
    # Find all SVG files
    svg_files = list(assets_dir.glob("*.svg"))
    
    if not svg_files:
        print("No SVG files found in the assets directory")
        return False
    
    print(f"Found {len(svg_files)} SVG files to convert:")
    for svg_file in svg_files:
        print(f"  - {svg_file.name}")
    
    print("\nStarting conversion...")
    
    success_count = 0
    total_count = len(svg_files)
    
    # Convert each SVG to PNG
    for svg_file in svg_files:
        png_file = svg_file.with_suffix('.png')
        
        if convert_svg_to_png(svg_file, png_file):
            success_count += 1
    
    print(f"\nConversion completed: {success_count}/{total_count} files converted successfully")
    
    if success_count == total_count:
        print("All SVG files have been successfully converted to PNG!")
        return True
    else:
        print(f"Some conversions failed. Please check the errors above.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)