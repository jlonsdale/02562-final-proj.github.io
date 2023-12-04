window.onload = function () {
  main();
};

let scrollValue = 10;
let theta = 0.0;
let dtheta = 0.01;
let coinThickness = 0.1;
let intensity = 20;

const minscrollValue = 5;
const maxscrollValue = 100;

async function main() {
  const handleScroll = (event) => {
    scrollValue = Math.max(
      minscrollValue,
      Math.min(maxscrollValue, scrollValue + (event.deltaY < 0 ? -0.05 : 0.05))
    );
  };

  const speedSlider = document.getElementById("speedSlider");
  speedSlider.oninput = (event) => {
    dtheta = parseFloat(event.target.value);
  };

  const thicknessSlider = document.getElementById("thicknessSlider");
  thicknessSlider.oninput = (event) => {
    coinThickness = parseFloat(event.target.value);
  };

  const itensitySlider = document.getElementById("itensitySlider");
  itensitySlider.oninput = (event) => {
    intensity = parseFloat(event.target.value);
  };

  const gpu = navigator.gpu;
  const adapter = await gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const canvas = document.getElementById("c");

  // Function to get img data
  const getImgData = async () => {
    const image = document.getElementById("tex");

    const hiddenCanvas = document.createElement("canvas");
    hiddenCanvas.style.display = "none";
    hiddenCanvas.width = image.width;
    hiddenCanvas.height = image.height;
    hiddenCanvas.id = "hidden_canvas";
    await document.body.appendChild(hiddenCanvas);

    const ctx = document.getElementById("hidden_canvas").getContext("2d");

    ctx.drawImage(image, 0, 0, image.width, image.height);
    const imageData = ctx.getImageData(
      0,
      0,
      hiddenCanvas.width,
      hiddenCanvas.height
    );
    return imageData;
  };

  const textureimg = await getImgData();

  let textureData = new Uint8Array(textureimg.width * textureimg.height * 4);
  for (let i = 0; i < textureimg.height; ++i)
    for (let j = 0; j < textureimg.width; ++j)
      for (let k = 0; k < 4; ++k)
        textureData[(i * textureimg.width + j) * 4 + k] =
          textureimg.data[
            ((textureimg.height - i - 1) * textureimg.width + j) * 4 + k
          ];

  const texture = device.createTexture({
    size: [textureimg.width, textureimg.height, 1],
    format: "rgba8unorm",
    usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
  });

  device.queue.writeTexture(
    { texture: texture },
    textureData,
    {
      offset: 0,
      bytesPerRow: textureimg.width * 4,
      rowsPerImage: textureimg.height,
    },
    [textureimg.width, textureimg.height, 1]
  );

  let selectedWrapMode = "repeat";
  let selectedTexMode = "linear";

  console.log(textureimg);

  // Get references to the select elements
  const wrapModeSelect = document.getElementById("wrapMode");
  const filterModeSelect = document.getElementById("filterMode");

  texture.sampler = device.createSampler({
    addressModeU: selectedWrapMode,
    addressModeV: selectedWrapMode,
    minFilter: selectedTexMode,
    magFilter: selectedTexMode,
  });

  const context =
    canvas.getContext("gpupresent") || canvas.getContext("webgpu");
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device: device,
    format: canvasFormat,
  });
  const wgsl = device.createShaderModule({
    code: document.getElementById("wgsl").text,
  });

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: wgsl,
      entryPoint: "main_vs",
    },
    fragment: {
      module: wgsl,
      entryPoint: "main_fs",
      targets: [{ format: canvasFormat }],
    },
    primitive: {
      topology: "triangle-strip",
    },
  });

  window.addEventListener("wheel", handleScroll);

  const render = async () => {
    theta += dtheta;
    let funiforms = new Float32Array([
      scrollValue,
      theta,
      coinThickness,
      intensity,
    ]);

    const f_uniformBuffer = await device.createBuffer({
      size: funiforms.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(f_uniformBuffer, 0, funiforms);

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: f_uniformBuffer } },
        { binding: 1, resource: texture.sampler },
        { binding: 2, resource: texture.createView() },
      ],
    });

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(4);
    pass.end();

    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(render);
  };
  render();
}
